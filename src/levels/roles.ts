import { CATALOGUE } from "~/sim/catalogue"
import {
  consistencyOf,
  copies,
  doesHeavyWorkInline,
  partitionKeyOf,
  shardsOf,
} from "~/sim/simulate"
import type {
  ComponentKind,
  Graph,
  LoadProfile,
  PlacedComponent,
  SimResult,
} from "~/sim/types"
import { CLIENT_ID } from "~/sim/types"

/**
 * What a level's system is actually about, in plain words. The discussion
 * panel combines this with a component's wiring to say what that component is
 * doing in this particular design, not just what it is in general.
 */
export type Scenario = {
  /** "the helpdesk". Used mid-sentence. */
  product: string
  /** Who reads what: "agents opening tickets". */
  reads: string
  /** "ticket replies and status changes". */
  writes: string
  /** The hot, shared data a cache or CDN would hold. */
  hot: string
  /** What the system of record keeps. */
  records: string
  files?: string
  /** Slow work that shouldn't block a request. */
  job?: string
  events?: string
  /**
   * Why the hot data can live in memory with nothing behind it: it's rebuilt
   * or replaced so often that losing it costs little.
   */
  memoryOnly?: string
}

export const GENERIC_SCENARIO: Scenario = {
  product: "your product",
  reads: "users loading data",
  writes: "users changing data",
  hot: "the most-read data",
  records: "the system's data",
}

export type Discussion = {
  role: string
  /** Shown only once a repair level's culprit is found: it can give the answer away. */
  caution?: string
  tradeoffs: string[]
}

type Ctx = {
  s: Scenario
  up: ComponentKind[]
  down: ComponentKind[]
  graph: Graph
  id: string
  load: LoadProfile
}

const list = (kinds: ComponentKind[]) => {
  const t = [...new Set(kinds)].map((k) => `{${k}}`)
  if (t.length <= 1) return t[0] ?? ""
  return `${t.slice(0, -1).join(", ")} and ${t[t.length - 1]}`
}
const isData = (k: ComponentKind) => CATALOGUE[k].category === "data"

/**
 * What sharding and the consistency choice add to a store's story, in levels
 * that offer them. Empty everywhere else.
 */
function dataChoices(c: PlacedComponent | undefined, load: LoadProfile) {
  if (!c) return { role: "", tradeoffs: [] as string[] }
  const key = partitionKeyOf(c, load)
  const mode = consistencyOf(c, load)
  const n = shardsOf(c, load)
  const d = copies(c)
  let role = ""
  const tradeoffs: string[] = []
  if (key) {
    role +=
      n > 1
        ? ` Its data is split into ${n} shards by ${key.label}, so each shard takes only its share of the writes.`
        : ` It's one shard: everything lives together until you split it.`
    tradeoffs.push(
      "A partition key is hard to change later: moving to a new one means copying every record to a new home while the system keeps running.",
    )
  }
  if (mode === "strong")
    role += ` A write commits only once a majority of its ${d} cop${d === 1 ? "y has" : "ies have"} it.${d === 2 ? " With two copies, a split leaves neither side with a majority." : ""}`
  if (mode === "eventual")
    role += ` Each of its ${d} cop${d === 1 ? "y" : "ies"} accepts writes on its own and passes them on, so during a split every side keeps working, and they disagree until it heals.`
  if (mode)
    tradeoffs.push(
      mode === "strong"
        ? "Consistent: during a split the side without a majority refuses requests, and every write waits for another zone to confirm it."
        : "Available: nobody is refused, but readers can see old data, and conflicting writes need a rule for which one wins.",
    )
  return { role, tradeoffs }
}

const ROLE: Record<ComponentKind, (c: Ctx) => Discussion> = {
  dns: ({ s, down }) => ({
    role: `Turns ${s.product}'s domain name into the address of ${list(down) || "your entry point"}. Every visit starts here, but resolvers cache the answer, so it's almost never the bottleneck.`,
    tradeoffs: [
      "A short TTL makes failover fast, but means more lookups and more load on DNS.",
      "A long TTL is cheap, but users keep hitting an old address for minutes after you move.",
    ],
  }),
  cdn: ({ s, down }) => ({
    role: `Serves ${s.hot} from edge locations close to users, so those requests never reach ${list(down) || "your origin"}. Only misses, and writes (${s.writes}), travel on to the origin.`,
    caution:
      down.length === 0
        ? "Nothing sits behind it, so a miss has nowhere to go."
        : undefined,
    tradeoffs: [
      "Purging is the hard part: a new version of a file can take minutes to replace the old one everywhere.",
      "Only shared, public responses belong here. Cache something per-user and you can show one user another's data.",
    ],
  }),
  "load-balancer": ({ s, down }) => ({
    role: `Spreads ${s.reads}, and ${s.writes}, across the instances of ${list(down) || "whatever sits behind it"}, and stops sending to any that fail a health check. That's what turns a crashed instance into reduced capacity rather than failed requests.`,
    caution: down.some(isData)
      ? `It's wired straight to ${list(down.filter(isData))}. A load balancer only forwards requests: something has to run ${s.product}'s code and decide which queries to make.`
      : undefined,
    tradeoffs: [
      "Managed balancers are redundant across zones already, so it isn't a single point of failure the way a self-run one would be.",
      "Sticky sessions make stateful apps work, but uneven load and lost sessions on failure follow. Stateless servers avoid both.",
    ],
  }),
  "api-gateway": ({ s, down }) => ({
    role: `The front door for ${s.product}'s API: it checks who's calling, applies rate limits, then routes ${s.reads} and ${s.writes} to ${list(down) || "the services behind it"}.`,
    caution: down.some(isData)
      ? `It's wired straight to ${list(down.filter(isData))}. Something still has to run the business logic.`
      : undefined,
    tradeoffs: [
      "Centralising auth and limits means services don't reimplement them, but every request now pays a few extra milliseconds.",
      "It becomes a shared dependency: a bad config change there affects every API at once.",
    ],
  }),
  "app-server": ({ s, down, graph, id, load }) => {
    const c = graph.components.find((c) => c.id === id)
    const inline =
      load.heavyWriteFraction > 0 &&
      c !== undefined &&
      doesHeavyWorkInline(graph, c)
    const queued = down.find((k) => CATALOGUE[k].async)
    return {
      role: `Runs ${s.product}'s code. Each request (${s.reads}, ${s.writes}) lands on one instance, which then calls ${list(down) || "nothing yet"}. It keeps no data of its own between requests, which is why you can add instances freely.${queued && s.job ? ` The slow part, ${s.job}, is handed to {${queued}} so nobody waits for it.` : ""}`,
      caution:
        inline && s.job
          ? `Right now it's also ${s.job} while the user waits, which costs seconds per request and most of its capacity.`
          : down.length === 0
            ? "It doesn't call anything, so there's nowhere for data to be stored."
            : undefined,
      tradeoffs: [
        "More instances means more capacity and survives crashes, but every instance must be stateless: sessions live in a token or a shared store.",
        "Each instance holds connections to the database. A large fleet can exhaust the database's connection limit before its CPU.",
      ],
    }
  },
  serverless: ({ s, down }) => ({
    role: `Runs ${s.product}'s code per request with nothing to manage: the provider starts copies as traffic arrives and stops them when it goes. Each invocation then calls ${list(down) || "nothing yet"}.`,
    tradeoffs: [
      "Cold starts: the first request to a new copy waits for it to boot, which shows up in the p99.",
      "Cheap for spiky or low traffic. At steady high volume, always-on containers usually cost less.",
    ],
  }),
  cache: ({ s, down }) =>
    down.length === 0 && s.memoryOnly
      ? {
          role: `Holds ${s.hot}, in memory only, and answers ${s.reads} in about a millisecond. Nothing sits behind it on purpose: ${s.memoryOnly}`,
          tradeoffs: [
            "Losing a node loses its share of the data until it's rebuilt or replaced, so run two nodes in different zones.",
            "Memory is the limit on how much it can hold, so keep only what's needed right now.",
          ],
        }
      : {
          role: `Keeps ${s.hot} in memory. Requests for them, from ${s.reads}, are answered from RAM in about a millisecond instead of with a query to ${list(down) || "a database"}. Writes (${s.writes}) pass through to ${list(down) || "the store behind it"}, and the cached copy is deleted or left to expire.`,
          caution:
            down.length === 0
              ? "Nothing sits behind it, so every miss, and every write, has nowhere to go."
              : undefined,
          tradeoffs: [
            `Stale reads: until an entry expires or is invalidated, someone can see ${s.hot} a little out of date.`,
            `Cold start: after a restart every read misses at once and ${list(down) || "the database"} takes the full load. Run two nodes, or make sure the database can survive it.`,
            "It only helps data that is shared and read often. Data each user reads once barely gets a hit.",
          ],
        },
  "sql-primary": ({ s, graph, id, load }) => {
    const c = graph.components.find((c) => c.id === id)
    const extra = dataChoices(c, load)
    // Read/write splitting: one of this primary's callers also reads replicas.
    const callers = graph.edges.filter((e) => e.to === id).map((e) => e.from)
    const replicas = graph.edges.some(
      (e) =>
        callers.includes(e.from) &&
        graph.components.find((t) => t.id === e.to)?.kind === "sql-replica",
    )
    return {
      role: `The system of record for ${s.records}. Every write (${s.writes}) lands here inside a transaction, so it's the one place that's always correct.${replicas ? " Reads have been moved to replicas, so here it mostly takes writes." : ""}${c && c.instances > 1 ? ` The ${c.instances - 1} extra instance${c.instances > 2 ? "s are standbys" : " is a standby"}: a copy in another zone, ready to take over if this one fails, but serving nothing until then.` : ""}${extra.role}`,
      tradeoffs: [
        ...extra.tradeoffs,
        "Writes don't scale out: one primary takes them all. Past that, you shard the data or move it to a store built to partition.",
        "A standby doubles the cost and adds no capacity. You pay it for availability, not speed.",
        "Backups protect against losing data; standbys protect against downtime. You need both.",
      ],
    }
  },
  "sql-replica": ({ s }) => ({
    role: `A read-only copy of ${s.records}, kept in sync from the primary a few milliseconds behind. It answers ${s.reads} so the primary can concentrate on ${s.writes}.`,
    tradeoffs: [
      "Replication lag: a user who just saved something may read the old version from a replica. Send their reads to the primary for a few seconds after a write.",
      "Each replica costs as much as the primary. For hot, shared data, a cache is usually cheaper.",
      "It can't take writes at all. Point writes at it and they fail.",
    ],
  }),
  nosql: ({ s, graph, id, load }) => {
    const extra = dataChoices(
      graph.components.find((c) => c.id === id),
      load,
    )
    return {
      role: `Stores ${s.records} as items looked up by key, split across partitions so writes scale out by adding capacity.${extra.role}`,
      tradeoffs: [
        ...extra.tradeoffs,
        "You design tables around your access patterns up front. Ad-hoc queries and joins are hard or impossible.",
        "A hot key (one very popular item) lands on one partition and can throttle however much capacity you buy.",
      ],
    }
  },
  queue: ({ s, down }) => ({
    role: `Holds a message for each piece of slow work (${s.job ?? s.writes}) until ${list(down) || "a consumer"} is free to take it. The user's request finishes as soon as the message is safely queued. Each message goes to exactly one consumer.`,
    caution:
      down.length === 0
        ? "Nothing consumes from it, so messages pile up forever."
        : down.length > 1
          ? `It's feeding ${list(down)}, so they split the messages between them: each sees only part of the stream.`
          : undefined,
    tradeoffs: [
      "Delivery is at least once: a message can arrive twice, so consumers must be safe to repeat.",
      "The user gets an immediate answer but not the final result. You need a way to tell them when the work is done.",
    ],
  }),
  "event-stream": ({ s, down }) => ({
    role: `Records ${s.events ?? "an event for every write"} in an ordered log. Each consumer (${list(down) || "none yet"}) reads every event at its own pace, so adding a consumer never touches or slows the producer.`,
    tradeoffs: [
      "Ordering is only guaranteed within a partition, so the partition key decides which events stay in order.",
      "Consumers see changes a little later than the database does. Anything they serve is eventually consistent.",
      "More moving parts and more cost than a direct call, worth it once two or more systems need the same events.",
    ],
  }),
  worker: ({ s, up, down }) => ({
    role: `Pulls messages from ${list(up) || "a queue"} and does ${s.job ?? "the background work"}${down.length ? `, saving the results to ${list(down)}` : ""}. Users never wait on it: if it falls behind, the queue gets longer instead of requests failing.`,
    tradeoffs: [
      "Size the pool for the arrival rate at peak, not the average, or the backlog only ever grows.",
      "A job that keeps failing will be retried forever unless failed messages go to a dead-letter queue.",
    ],
  }),
  "object-store": ({ s }) => ({
    role: `Keeps ${s.files ?? "files"} as objects: very durable, practically unlimited, and cheap per gigabyte.`,
    tradeoffs: [
      "Tens of milliseconds per request: fine for files, too slow to use as a database.",
      "Pair it with a CDN for anything read often, and keep the metadata (who owns what) in a database.",
    ],
  }),
  "search-index": ({ s, up }) => ({
    role: `Holds a searchable copy of ${s.records}${up.length ? `, fed by ${list(up)}` : ""}. It's a derived view: if it's lost, you rebuild it from the source of truth.`,
    tradeoffs: [
      "It lags the database slightly, so a brand-new item may not be searchable for a second or two.",
      "Indexes are expensive to run. Keep only the fields people actually search.",
    ],
  }),
  "doc-ai": ({ s, up }) => ({
    role: `Reads ${s.files ?? "uploaded documents"} and returns structured fields. Each call takes seconds and the provider caps calls per second, so it's called by ${list(up) || "something"} at a steady pace rather than by users directly.`,
    caution: up.some((k) => k === "app-server" || k === "serverless")
      ? `It's called straight from ${list(up.filter((k) => k === "app-server" || k === "serverless"))}, so every upload waits seconds for it and a burst runs straight into the rate limit.`
      : undefined,
    tradeoffs: [
      "Throughput is a quota you request from the provider, and raising it takes time. Ask before the peak, not during it.",
      "Results come with confidence scores. Low-confidence fields need a human to check them, which is a product decision as much as a technical one.",
      "It's billed per page, so duplicate uploads and retries cost real money.",
    ],
  }),
  "third-party-api": ({ s, up }) => ({
    role: `Someone else's service that ${s.product} depends on, called by ${list(up) || "nothing yet"}. ${s.job ? `It's used for ${s.job}. ` : ""}You don't run it, so its speed and its quota are outside your control.`,
    caution: up.some((k) => k === "app-server" || k === "serverless")
      ? `It's called straight from ${list(up.filter((k) => k === "app-server" || k === "serverless"))}, so when it slows down, users wait for it.`
      : undefined,
    tradeoffs: [
      "Its quota is a contract: raising it takes a conversation, not a setting.",
      "When it's slow, timeouts decide whether that's your problem too. Without them, every caller waits.",
      "A retried charge needs an idempotency key, or a timeout can turn into a double payment.",
    ],
  }),
  "data-warehouse": ({ s, up }) => ({
    role: `Keeps the full history of ${s.events ?? s.records} in columnar storage, built for analysts' big queries over months of data.`,
    caution: up.some((k) => CATALOGUE[k].category === "compute")
      ? `Here it's called directly by ${list(up.filter((k) => CATALOGUE[k].category === "compute"))}, so every user request waits on a system built for ten-minute queries.`
      : undefined,
    tradeoffs: [
      "Brilliant at scanning billions of rows, terrible at answering one small question quickly.",
      "Feed it asynchronously (events or change data capture). Its numbers are minutes behind, which is fine for analytics.",
    ],
  }),
  "realtime-gateway": ({ s, down }) => ({
    role: `Holds an open connection to every ${s.product} user who's online, so messages reach them the moment they happen. It passes what users send to ${list(down) || "the services behind it"}.`,
    tradeoffs: [
      "Connections are long-lived, so deploys and failovers drop thousands at once: clients must reconnect with backoff.",
      "Sending to one user means finding the server that holds their connection.",
    ],
  }),
  pubsub: ({ up, down }) => ({
    role: `Takes each message from ${list(up) || "its publishers"} and pushes a copy to every subscriber: ${list(down) || "none yet"}. They don't know about each other, so adding one changes nothing for the rest.`,
    tradeoffs: [
      "No replay: a push that keeps failing is retried for a while, then dropped, unless a {queue} holds it for the subscriber.",
      "Delivery is at least once, so subscribers must cope with duplicates.",
    ],
  }),
  "push-service": ({ up }) => ({
    role: `Delivers notifications to users' phones for ${list(up) || "whoever calls it"}, through the phone platforms' push networks.`,
    tradeoffs: [
      "Delivery is best effort: a phone that's off gets it later, or never.",
      "Device tokens go stale, so failed sends must be cleaned up or the list rots.",
    ],
  }),
  "stream-processor": ({ up, down }) => ({
    role: `Runs a continuous job over events from ${list(up) || "a stream"}, keeping running counts and windows, and writes results to ${list(down) || "somewhere"}.`,
    tradeoffs: [
      "Exactly-once results need checkpoints and an output that can take a replayed write.",
      "Late events need a rule: wait for them, or correct the result afterwards.",
    ],
  }),
  scheduler: ({ down }) => ({
    role: `Starts jobs on a timetable at ${list(down) || "whatever it's wired to"}. It decides when work runs, not how.`,
    tradeoffs: [
      "If a run is missed or runs twice, the job must be safe to repeat.",
      "Many jobs due at the same moment become a spike: spread them out.",
    ],
  }),
  "time-series-db": ({ up }) => ({
    role: `Stores timestamped measurements from ${list(up) || "its writers"} and answers questions over time ranges.`,
    tradeoffs: [
      "Fast to append and to read a range; slow to update or query by anything but time and tags.",
      "Too many distinct tag values (high cardinality) is what usually breaks it.",
    ],
  }),
  coordination: ({ up }) => ({
    role: `Holds the few facts ${list(up) || "the servers"} must agree on: the leader, the locks, the config.`,
    tradeoffs: [
      "A majority must answer every write, so it's small and slow to write by design.",
      "Lose the majority and nobody can take a lock or elect a leader until it's back.",
    ],
  }),
  "graph-db": ({ up }) => ({
    role: `Stores ${list(up) ? `what ${list(up)} records` : "things"} and the links between them, and follows those links quickly.`,
    tradeoffs: [
      "Short traversals are fast; the whole graph rarely fits one machine, and splitting it cuts paths.",
      "Fewer people know how to run one than a SQL or key-value store.",
    ],
  }),
  "vector-db": ({ up }) => ({
    role: `Finds stored items closest in meaning to a query from ${list(up) || "its callers"}, using embeddings from a model.`,
    tradeoffs: [
      "Approximate search: faster, but sometimes misses the true closest match.",
      "A new embedding model means re-embedding everything.",
    ],
  }),
  "rate-limiter": ({ down }) => ({
    role: `Counts requests per caller and turns away the excess before it reaches ${list(down) || "anything behind it"}.`,
    tradeoffs: [
      "Limits too tight block real users; too loose and they protect nothing.",
      "Counting across many servers needs a shared counter, which is one more thing on the path.",
    ],
  }),
  "llm-api": ({ up }) => ({
    role: `Generates answers for ${list(up) || "its callers"} from a prompt: the question, the passages it's given, and instructions. Billed per token, and quota'd in tokens a minute.`,
    tradeoffs: [
      "It's usually most of the bill and most of the wait: every token you trim from the prompt saves both.",
      "The first words arrive in a second or two; stream them, so nobody watches a spinner for the whole answer.",
    ],
  }),
  "llm-batch": ({ up }) => ({
    role: `Takes ${list(up) || "a file of requests"}'s calls in bulk and returns the answers within about a day, at about half the price.`,
    tradeoffs: [
      "Cheap and plentiful, and useless for anyone waiting: only work that can wait a day belongs here.",
      "Results come back as a file, so something must match them to their requests and retry the failures.",
    ],
  }),
  "auth-service": ({ up }) => ({
    role: `Signs users in for ${list(up) || "the app"} and issues tokens the other services can check on their own.`,
    tradeoffs: [
      "Checking tokens locally keeps it off the request path, but makes revoking one before it expires harder.",
      "If it's down, nobody new can sign in, though people already signed in carry on.",
    ],
  }),
}

/** What this component is doing in this design, and what it costs you. */
export function discuss(
  graph: Graph,
  id: string,
  scenario: Scenario,
  load: LoadProfile,
): Discussion | undefined {
  const c = graph.components.find((c) => c.id === id)
  if (!c) return undefined
  const kindOf = (nid: string) =>
    graph.components.find((t) => t.id === nid)?.kind
  const up = graph.edges
    .filter((e) => e.to === id && e.from !== CLIENT_ID)
    .flatMap((e) => kindOf(e.from) ?? [])
  const down = graph.edges
    .filter((e) => e.from === id)
    .flatMap((e) => kindOf(e.to) ?? [])
  return ROLE[c.kind]({ s: scenario, up, down, graph, id, load })
}

const r = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`

/**
 * The same component, in numbers, at the current traffic. Uses `{kind}`
 * tokens like everything else.
 */
export function liveFacts(
  graph: Graph,
  id: string,
  result: SimResult,
): string[] {
  const c = graph.components.find((c) => c.id === id)
  const m = result.perComponent[id]
  if (!c || !m) return []
  const spec = CATALOGUE[c.kind]
  const inbound = m.readRps + m.writeRps
  const outEdges = graph.edges.filter((e) => e.from === id)
  const out = outEdges.reduce((t, e) => t + (result.perEdge[e.id]?.rps ?? 0), 0)
  const facts: string[] = []
  if (inbound <= 0) return ["No traffic is reaching it at the moment."]

  if (spec.caches) {
    const served = Math.max(0, inbound - out)
    facts.push(
      `It answers ${r(served)}/s itself (${Math.round((served / inbound) * 100)}% of the ${r(inbound)}/s that reach it) and passes ${r(out)}/s on.`,
    )
  } else if (spec.broadcasts) {
    facts.push(
      `${r(m.writeRps)} events/s go in, and each of its ${outEdges.length} consumer${outEdges.length === 1 ? "" : "s"} receives all of them.`,
    )
  } else if (spec.routesTraffic) {
    facts.push(
      `${r(inbound)}/s arrive and are split between ${outEdges.length} target${outEdges.length === 1 ? "" : "s"}.`,
    )
  } else {
    facts.push(
      `It handles ${r(m.readRps)} reads/s and ${r(m.writeRps)} writes/s, using ${Number.isFinite(m.utilization) ? `${Math.round(m.utilization * 100)}%` : "more than all"} of its capacity, with a p99 of ${m.p99Ms >= 1000 ? `${(m.p99Ms / 1000).toFixed(1)}s` : `${Math.round(m.p99Ms)}ms`}.`,
    )
  }
  if (m.behindAsync)
    facts.push(
      "It sits behind an asynchronous hand-off, so users never wait for it.",
    )
  return facts
}
