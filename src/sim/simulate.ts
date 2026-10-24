import {
  CATALOGUE,
  DEFAULT_JOB,
  inlineJobCost,
  inlineJobMs,
  monthlyUsageUsd,
  NOSQL_KEY_LIMIT,
  workerJobsPerSecond,
  LATENCY_INFLATION_CAP,
} from "./catalogue"
import type {
  ComponentKind,
  ComponentMetrics,
  Consistency,
  Edge,
  Fault,
  Graph,
  LoadProfile,
  PartitionKey,
  PlacedComponent,
  SimResult,
} from "./types"
import { CLIENT_ID } from "./types"
import { authPoints, floodLeak } from "./practices"

/** Share of the cacheable reads a warm cache actually serves. */
export const CACHE_HIT_EFFICIENCY = 0.95
/** A path carrying less than this share of requests can't move the p99. */
const P99_PATH_SHARE = 0.01

type Flow = { reads: number; writes: number; cacheable: number }
const ZERO: Flow = { reads: 0, writes: 0, cacheable: 0 }

export type Carries = "all" | "reads" | "writes"

/**
 * What half of the workload an edge carries, derived from its endpoints so the
 * player never has to annotate a line.
 *
 * Into or out of a queue or stream: messages, which are writes. Into a read-only
 * store: reads. A writes-to-a-replica mistake is therefore impossible to draw by
 * accident, but routing ALL traffic through a replica (as the only store) still
 * shows up, because a component's own writes have nowhere to go.
 */
export function carries(graph: Graph, edge: Edge): Carries {
  const from = graph.components.find((c) => c.id === edge.from)
  const to = graph.components.find((c) => c.id === edge.to)
  if (from && CATALOGUE[from.kind].async) return "writes"
  if (to && CATALOGUE[to.kind].async) return "writes"
  if (to && CATALOGUE[to.kind].readOnly) return "reads"
  // A search index is fed by events and queried by apps. A synchronous write
  // to it from the request path is never the intent of drawing that line.
  if (to?.kind === "search-index") return "reads"
  // Read/write splitting: once a caller has replicas, its primary takes writes.
  if (
    to?.kind === "sql-primary" &&
    graph.edges.some(
      (e) =>
        e.from === edge.from &&
        graph.components.find((c) => c.id === e.to)?.kind === "sql-replica",
    )
  )
    return "writes"
  return "all"
}

/** Instances still standing after a round's faults. */
export function aliveInstances(
  c: PlacedComponent,
  faults: Fault[],
  /** Someone would notice it hanging: its own alerts, or its queue's. */
  watched = c.practices?.alerts === true,
): number {
  const spec = CATALOGUE[c.kind]
  let alive = c.instances
  for (const f of faults) {
    if (f.kind === "kill-instance" && f.target === c.kind) alive -= 1
    // Alerts get the stuck instance replaced; without them, every instance
    // stays stuck while health checks keep passing.
    if (f.kind === "silent-stall" && f.target === c.kind)
      alive = watched ? alive - 1 : 0
    if (f.kind === "zone-outage" && !spec.managed) {
      // Round-robin placement: zone 0 holds the ceiling share.
      const zones = Math.max(1, Math.min(c.zones, c.instances))
      alive -= Math.ceil(c.instances / zones)
    }
  }
  return Math.max(0, alive)
}

/**
 * Independent failure domains this component really occupies. One instance is
 * one domain however many zones it is nominally spread over; a managed service
 * counts as one, because its SLA already includes the provider's redundancy.
 */
export function failureDomains(c: PlacedComponent): number {
  if (CATALOGUE[c.kind].managed) return 1
  return Math.max(1, Math.min(c.instances, c.zones))
}

/**
 * Does this compute tier do heavy jobs inline, while the user waits?
 * It doesn't if it hands writes to a queue or stream.
 */
/** The tiers that run request code: where an inline slow job would land. */
const REQUEST_TIERS = new Set(["app-server", "serverless"])

export function doesHeavyWorkInline(graph: Graph, c: PlacedComponent): boolean {
  if (!REQUEST_TIERS.has(c.kind)) return false
  return !graph.edges.some((e) => {
    if (e.from !== c.id) return false
    const to = graph.components.find((t) => t.id === e.to)
    return to !== undefined && CATALOGUE[to.kind].async
  })
}

/** Components reached only through an async hand-off: off the critical path. */
export function behindAsync(graph: Graph): Set<string> {
  const byId = new Map(graph.components.map((c) => [c.id, c]))
  const sync = new Set<string>()
  const all = new Set<string>()
  const walk = (id: string, viaAsync: boolean) => {
    const seen = viaAsync ? all : sync
    if (seen.has(id)) return
    seen.add(id)
    all.add(id)
    const c = byId.get(id)
    const isAsync = c ? CATALOGUE[c.kind].async : false
    for (const e of graph.edges)
      if (e.from === id) walk(e.to, viaAsync || isAsync)
  }
  walk(CLIENT_ID, false)
  const out = new Set<string>()
  for (const id of all) if (!sync.has(id) && id !== CLIENT_ID) out.add(id)
  return out
}

/** A call with a timeout gives up after this long. */
export const TIMEOUT_MS = 500
/** A request holds a thread for at least this long, whatever its own p50. */
const THREAD_FLOOR_MS = 100
/** Calls made per attempt when a dependency is slow, by retry policy. */
export const RETRY_LOAD = { none: 1, immediate: 3, backoff: 1.2 } as const
/** Share of retried writes into a slow dependency that had already succeeded. */
export const DUPLICATE_SHARE = 0.1
/** Consumer capacity left while a poison message is retried forever. */
export const POISON_CAPACITY = 0.4
/** Data lost by restoring from each kind of backup, worst case. */
export const BACKUP_LOSS_MINUTES = {
  none: Infinity,
  daily: 24 * 60,
  "point-in-time": 5,
} as const

const retryLoad = (c: PlacedComponent | undefined) =>
  RETRY_LOAD[c?.practices?.retries ?? "none"]

/** Stores that can be split by one of a level's partition keys. */
const SHARDABLE = new Set<ComponentKind>(["sql-primary", "nosql"])
/** Stores whose replication mode is the player's choice. */
/**
 * Stores where letting every copy accept writes is a real option. Key-value
 * stores can replicate leaderless or multi-region; a {sql-primary} is single
 * leader, so in these levels it's always consistent.
 */
const TUNABLE = new Set<ComponentKind>(["nosql"])
export const MAX_SHARDS = 8
/** A strong write waits for a copy in another zone to confirm it. */
export const QUORUM_P99_MS = 5
/** A read that asks every shard waits for the slowest: this share of p99 per doubling. */
export const SCATTER_P99_FACTOR = 0.5

/**
 * The partition key a store's data is split by: its own choice, or the
 * level's first key until the player picks one. The sidebar shows this same
 * value, so it never claims a key the engine isn't using.
 */
export function partitionKeyOf(
  c: PlacedComponent,
  load: LoadProfile,
): PartitionKey | undefined {
  const keys = load.partitionKeys
  if (!SHARDABLE.has(c.kind) || !keys?.length) return undefined
  return keys.find((k) => k.id === c.partitionKey) ?? keys[0]
}

/**
 * Shards a store is split into. A {sql-primary} chooses: each shard is its own
 * primary with its own standbys. A {nosql} store splits across its instances.
 */
export function shardsOf(c: PlacedComponent, load: LoadProfile): number {
  if (!partitionKeyOf(c, load)) return 1
  if (c.kind === "nosql") return Math.max(1, c.instances)
  return Math.min(MAX_SHARDS, Math.max(1, c.shards ?? 1))
}

/** Undefined where the level doesn't make consistency a choice. */
export function consistencyOf(
  c: PlacedComponent,
  load: LoadProfile,
): Consistency | undefined {
  if (!load.tunableConsistency) return undefined
  if (c.kind === "sql-primary") return "strong"
  if (!TUNABLE.has(c.kind)) return undefined
  return c.consistency ?? "strong"
}

/**
 * Copies of the data a network split can separate. A managed store keeps
 * three, one per zone; a self-run one has one per zone it really occupies.
 */
export function copies(c: PlacedComponent): number {
  return CATALOGUE[c.kind].managed ? 3 : failureDomains(c)
}

/** Only a {sql-primary} pays per shard: a {nosql} store's shards are its instances. */
const paidShards = (c: PlacedComponent) =>
  c.kind === "sql-primary"
    ? Math.min(MAX_SHARDS, Math.max(1, c.shards ?? 1))
    : 1

export function monthlyCost(graph: Graph): number {
  return graph.components.reduce(
    (sum, c) =>
      sum +
      CATALOGUE[c.kind].costPerInstanceMonthUsd * c.instances * paidShards(c),
    0,
  )
}

/**
 * The whole engine. Pure and deterministic: the canvas, the grade and the
 * findings are all renders of what this returns.
 */
export function simulate(
  graph: Graph,
  load: LoadProfile,
  faults: Fault[] = [],
): SimResult {
  const byId = new Map(graph.components.map((c) => [c.id, c]))
  // A hung consumer shows up as its queue getting older.
  const watched = (c: PlacedComponent) =>
    c.practices?.alerts === true ||
    graph.edges.some(
      (e) =>
        e.to === c.id &&
        graph.components.some(
          (q) =>
            q.id === e.from && CATALOGUE[q.kind].async && q.practices?.alerts,
        ),
    )
  const alive = new Map(
    graph.components.map((c) => [c.id, aliveInstances(c, faults, watched(c))]),
  )
  const asyncSet = behindAsync(graph)
  const multiplier = faults.reduce(
    (m, f) => (f.kind === "traffic-spike" ? m * f.multiplier : m),
    1,
  )
  // Credential stuffing is extra traffic, unless every way in rate-limits it.
  const stuffing = faults.find((f) => f.kind === "credential-stuffing")
  const attack = stuffing
    ? 1 + (stuffing.multiplier - 1) * floodLeak(graph, stuffing.perKey)
    : 1
  const slow = faults.find((f) => f.kind === "slow-dependency")
  const offered = load.peakRps * multiplier * attack
  const split = faults.some((f) => f.kind === "network-split")
  const edgeCarries = new Map(graph.edges.map((e) => [e.id, carries(graph, e)]))

  const nodeFlow = new Map<string, Flow>()
  const edgeFlow = new Map<string, number>()

  /**
   * Split a component's outgoing flow across its edges.
   * Routers divide (and skip dead targets, which is what health checks are
   * for); broadcasters and callers send the full flow down every edge.
   */
  const distribute = (sourceId: string, flow: Flow) => {
    const source = byId.get(sourceId)
    const spec = source ? CATALOGUE[source.kind] : undefined
    const routes = spec ? spec.routesTraffic && !spec.broadcasts : true
    let outgoing = graph.edges.filter((e) => e.from === sourceId)
    if (routes) {
      const healthy = outgoing.filter((e) => (alive.get(e.to) ?? 0) > 0)
      if (healthy.length > 0) outgoing = healthy
    }
    const readers = outgoing.filter((e) => edgeCarries.get(e.id) !== "writes")
    const writers = outgoing.filter((e) => edgeCarries.get(e.id) !== "reads")
    // A caller spreads its reads across its replicas, the way a reader
    // endpoint does, rather than reading everything from each one.
    const isReplica = (e: Edge) => byId.get(e.to)?.kind === "sql-replica"
    const replicas = outgoing.filter(isReplica).length

    const out: { id: string; flow: Flow }[] = []
    for (const e of outgoing) {
      const c = edgeCarries.get(e.id) ?? "all"
      const readShare =
        c === "writes"
          ? 0
          : routes
            ? 1 / Math.max(1, readers.length)
            : isReplica(e)
              ? 1 / replicas
              : 1
      const writeShare =
        c === "reads" ? 0 : routes ? 1 / Math.max(1, writers.length) : 1
      // When only some writes are slow jobs (receipt photos among typed-in
      // receipts), a request tier queues just those and does the rest itself.
      // Only queues: an event stream carries every write as an event.
      const target = byId.get(e.to)
      const jobShare =
        load.heavyWriteFraction > 0 &&
        source !== undefined &&
        REQUEST_TIERS.has(source.kind) &&
        target?.kind === "queue"
          ? load.heavyWriteFraction
          : 1
      // Retries multiply the calls into a dependency while it's slow.
      const retried =
        slow && target?.kind === slow.target && source ? retryLoad(source) : 1
      const f: Flow = {
        reads: flow.reads * readShare * retried,
        writes: flow.writes * writeShare * jobShare * retried,
        cacheable: flow.cacheable * readShare,
      }
      if (f.reads + f.writes <= 0) continue
      edgeFlow.set(e.id, (edgeFlow.get(e.id) ?? 0) + f.reads + f.writes)
      out.push({ id: e.to, flow: f })
    }
    return out
  }

  const reads = offered * load.readFraction
  const queue = distribute(CLIENT_ID, {
    reads,
    writes: offered - reads,
    cacheable: reads * load.cacheableFraction,
  })
  const visits = new Map<string, number>()
  // Workers pace what's behind them: anything beyond their throughput waits
  // in the queue in front, rather than reaching the next component.
  const workerPassed = new Map<string, number>()
  while (queue.length > 0) {
    const next = queue.shift()
    if (!next) break
    const c = byId.get(next.id)
    if (!c) continue
    // A loop in the drawing must not spin forever.
    const v = (visits.get(c.id) ?? 0) + 1
    visits.set(c.id, v)
    if (v > graph.components.length * 4) continue

    const acc = nodeFlow.get(c.id) ?? { ...ZERO }
    acc.reads += next.flow.reads
    acc.writes += next.flow.writes
    acc.cacheable += next.flow.cacheable
    nodeFlow.set(c.id, acc)

    let out = next.flow
    // A dead cache is a cold cache: everything falls through to what's behind it.
    if (CATALOGUE[c.kind].caches && (alive.get(c.id) ?? 0) > 0) {
      const hits = next.flow.cacheable * CACHE_HIT_EFFICIENCY
      out = {
        reads: next.flow.reads - hits,
        writes: next.flow.writes,
        cacheable: next.flow.cacheable - hits,
      }
    }
    if (c.kind === "worker") {
      const cap = workerJobsPerSecond(load) * (alive.get(c.id) ?? 0)
      const passed = workerPassed.get(c.id) ?? 0
      const total = out.reads + out.writes
      const room = Math.max(0, cap - passed)
      if (total > room) {
        const k = total > 0 ? room / total : 0
        out = {
          reads: out.reads * k,
          writes: out.writes * k,
          cacheable: out.cacheable * k,
        }
      }
      workerPassed.set(c.id, passed + Math.min(total, room))
    }
    queue.push(...distribute(c.id, out))
  }

  const perComponent: Record<string, ComponentMetrics> = {}
  for (const c of graph.components) {
    const spec = CATALOGUE[c.kind]
    const flow = nodeFlow.get(c.id) ?? ZERO
    const up = alive.get(c.id) ?? 0
    const isAsync = asyncSet.has(c.id)
    const inline = load.heavyWriteFraction > 0 && doesHeavyWorkInline(graph, c)
    const units = spec.scalesOut ? up : Math.min(up, 1)
    const writeCost = inline
      ? 1 + load.heavyWriteFraction * (inlineJobCost(load) - 1)
      : 1
    // A worker's throughput depends on the job this level gives it.
    const perUnit =
      c.kind === "worker"
        ? {
            readRps: workerJobsPerSecond(load),
            writeRps: workerJobsPerSecond(load),
          }
        : spec.capacity
    const readCap = perUnit.readRps * units
    const writeCap = (perUnit.writeRps * units) / writeCost
    const rho = (load: number, cap: number) =>
      load <= 0 ? 0 : cap <= 0 ? Infinity : load / cap
    // Servers and balancers spend one pool of CPU on reads and writes alike,
    // so the two add up. Stores keep separate budgets, which is the
    // simplification that lets a replica absorb reads but never writes.
    const shared = spec.category === "compute" || spec.category === "edge"
    const utilization = shared
      ? rho(flow.reads, readCap) + rho(flow.writes, writeCap)
      : Math.max(rho(flow.reads, readCap), rho(flow.writes, writeCap))
    const inflation =
      utilization >= 1
        ? LATENCY_INFLATION_CAP
        : Math.min(LATENCY_INFLATION_CAP, 1 / (1 - utilization))
    const heavyP99 = inline && flow.writes > 0 ? inlineJobMs(load) : 0
    const m: ComponentMetrics = {
      readRps: flow.reads,
      writeRps: flow.writes,
      utilization,
      p99Ms: spec.baseLatency.p99Ms * inflation + heavyP99,
      droppedRps: shared
        ? utilization > 1
          ? (flow.reads + flow.writes) * (1 - 1 / utilization)
          : 0
        : Math.max(0, flow.reads - readCap) +
          Math.max(0, flow.writes - writeCap),
      aliveInstances: up,
      behindAsync: isAsync,
    }
    if (slow) slowDown(m, c, graph, slow, edgeFlow, flow, load)
    if (faults.some((f) => f.kind === "poison-message")) poisoned(m, c, graph)
    const key = partitionKeyOf(c, load)
    if (key) shard(m, c, key, flow, up)
    const mode = consistencyOf(c, load)
    if (mode) replicate(m, c, mode, flow, split)
    perComponent[c.id] = m
  }

  const perEdge: SimResult["perEdge"] = {}
  for (const e of graph.edges) {
    const from = byId.get(e.from)
    perEdge[e.id] = {
      rps: edgeFlow.get(e.id) ?? 0,
      async: from ? CATALOGUE[from.kind].async : false,
    }
  }

  const connected = graph.edges.some(
    (e) => e.from === CLIENT_ID && byId.has(e.to),
  )

  // Drops cascade, so summing them would double count one failure all the way
  // down a chain. The worst single point is a fair lower bound.
  let errorRate = connected ? 0 : 1
  let backlog = 0
  for (const c of graph.components) {
    const m = perComponent[c.id]
    if (!m) continue
    if (m.behindAsync) {
      backlog += m.droppedRps
      continue
    }
    // Losing an optional component degrades, it doesn't error.
    if (CATALOGUE[c.kind].optionalOnPath && m.aliveInstances === 0) continue
    errorRate = Math.max(errorRate, Math.min(1, m.droppedRps / offered))
  }
  // A queue nobody consumes from is a backlog by definition.
  for (const c of graph.components) {
    if (!CATALOGUE[c.kind].async) continue
    if (graph.edges.some((e) => e.from === c.id)) continue
    const f = nodeFlow.get(c.id)
    if (f) backlog += f.writes
  }

  let divergent = 0
  for (const m of Object.values(perComponent)) divergent += m.divergentRps ?? 0

  // Retried writes into the slow dependency, from callers with no
  // idempotency keys: some had already worked the first time.
  let duplicates = 0
  if (slow)
    for (const e of graph.edges) {
      const from = byId.get(e.from)
      const to = byId.get(e.to)
      if (to?.kind !== slow.target || !from?.practices?.retries) continue
      if (from.practices.idempotency) continue
      const writes = perComponent[e.to]?.writeRps ?? 0
      duplicates += (edgeFlow.get(e.id) ?? 0) > 0 ? writes * DUPLICATE_SHARE : 0
    }

  const exposed = faults.some((f) => f.kind === "unauthenticated-probe")
    ? authPoints(graph)
        .filter((c) => !c.practices?.auth)
        .map((c) => c.id)
    : []

  let dataLoss = 0
  if (faults.some((f) => f.kind === "bad-migration"))
    for (const c of graph.components)
      if (DURABLE.has(c.kind) && nodeFlow.has(c.id))
        dataLoss = Math.max(
          dataLoss,
          BACKUP_LOSS_MINUTES[c.practices?.backups ?? "none"],
        )

  return {
    perComponent,
    perEdge,
    offeredRps: offered,
    divergentRps: divergent,
    duplicateRps: duplicates,
    dataLossMinutes: dataLoss,
    exposed,
    p99Ms: connected
      ? criticalPathP99(graph, perComponent, perEdge, offered)
      : 0,
    errorRate,
    availability: topologyAvailability(graph, asyncSet, load),
    monthlyCostUsd: Math.round(
      monthlyCost(graph) +
        graph.components.reduce((sum, c) => {
          const f = nodeFlow.get(c.id)
          return f
            ? sum +
                monthlyUsageUsd(
                  CATALOGUE[c.kind],
                  f.reads,
                  f.writes,
                  load.averageOfPeak,
                )
            : sum
        }, 0),
    ),
    backlogGrowthRps: backlog,
    connected,
  }
}

/**
 * The slowest path a meaningful share of requests takes. Paths carrying under
 * 1% of traffic can't move the p99, which is exactly why a well-placed cache
 * takes the database off the user's tail latency.
 */
function criticalPathP99(
  graph: Graph,
  perComponent: Record<string, ComponentMetrics>,
  perEdge: SimResult["perEdge"],
  offered: number,
): number {
  const byId = new Map(graph.components.map((c) => [c.id, c]))
  const walk = (id: string, depth: number): number => {
    if (depth > 32) return 0
    const c = byId.get(id)
    const here = c ? (perComponent[id]?.p99Ms ?? 0) : 0
    if (c && CATALOGUE[c.kind].async) return here
    let worst = 0
    for (const e of graph.edges) {
      if (e.from !== id) continue
      const share = (perEdge[e.id]?.rps ?? 0) / Math.max(1, offered)
      if (share < P99_PATH_SHARE) continue
      worst = Math.max(worst, walk(e.to, depth + 1))
    }
    return here + worst
  }
  return walk(CLIENT_ID, 0)
}

/**
 * P(the system serves a request), from the topology alone. Serial components
 * multiply; redundancy across independent domains composes as 1 - (1-a)^n.
 * Optional components and anything behind a queue are left out: losing them
 * degrades the product, it doesn't take it down.
 */
export function topologyAvailability(
  graph: Graph,
  asyncSet = behindAsync(graph),
  load?: LoadProfile,
): number {
  const reachable = new Set<string>()
  const walk = (id: string) => {
    if (reachable.has(id)) return
    reachable.add(id)
    for (const e of graph.edges) if (e.from === id) walk(e.to)
  }
  walk(CLIENT_ID)
  reachable.delete(CLIENT_ID)
  if (reachable.size === 0) return 0

  let a = 1
  for (const c of graph.components) {
    if (!reachable.has(c.id) || asyncSet.has(c.id)) continue
    const spec = CATALOGUE[c.kind]
    if (spec.optionalOnPath) continue
    const one = 1 - Math.pow(1 - spec.baselineAvailability, failureDomains(c))
    // A read that asks every shard needs every shard up. One that names its
    // key needs only the shard holding it.
    const key = load && partitionKeyOf(c, load)
    const n =
      key && key.scatterReads > 0 && c.kind === "sql-primary"
        ? shardsOf(c, load)
        : 1
    a *= Math.pow(one, n)
  }
  return a
}

const DURABLE = new Set<ComponentKind>(["sql-primary", "nosql", "object-store"])

/**
 * A slow dependency, seen from both ends. The dependency's answers take
 * longer; each caller holds a thread for as long as it waits, which is all of
 * it without a timeout. A sync call that times out fails the request; one
 * behind a queue goes back on the queue.
 */
function slowDown(
  m: ComponentMetrics,
  c: PlacedComponent,
  graph: Graph,
  slow: Extract<Fault, { kind: "slow-dependency" }>,
  edgeFlow: Map<string, number>,
  flow: Flow,
  load: LoadProfile,
) {
  const spec = CATALOGUE[c.kind]
  const byId = new Map(graph.components.map((x) => [x.id, x]))
  if (c.kind === slow.target) {
    const callers = graph.edges
      .filter((e) => e.to === c.id)
      .flatMap((e) => byId.get(e.from) ?? [])
    const capped =
      callers.length > 0 && callers.every((x) => x.practices?.timeouts)
    m.p99Ms += capped ? Math.min(slow.extraMs, TIMEOUT_MS) : slow.extraMs
    // Calls cut off by a timeout fail, synchronously.
    if (capped && slow.extraMs > TIMEOUT_MS && !m.behindAsync)
      m.droppedRps = flow.reads + flow.writes
    return
  }
  const inbound = flow.reads + flow.writes
  if (inbound <= 0) return
  let held = 0
  for (const e of graph.edges) {
    if (e.from !== c.id || byId.get(e.to)?.kind !== slow.target) continue
    const share = (edgeFlow.get(e.id) ?? 0) / inbound
    const wait = c.practices?.timeouts
      ? Math.min(slow.extraMs, TIMEOUT_MS)
      : slow.extraMs
    held += share * wait
  }
  if (held <= 0) return
  // Fewer threads free means less capacity, in proportion. A worker's
  // ordinary time per job is the level's job; anything else, its p50.
  const usual =
    c.kind === "worker"
      ? (load.job ?? DEFAULT_JOB).seconds * 1000
      : spec.baseLatency.p50Ms
  const k = 1 + held / Math.max(THREAD_FLOOR_MS, usual)
  scaleCapacity(m, k)
}

/** Consumers of a queue with no dead-letter queue lose capacity to retries. */
function poisoned(m: ComponentMetrics, c: PlacedComponent, graph: Graph) {
  const fedBy = graph.edges
    .filter((e) => e.to === c.id)
    .flatMap((e) => graph.components.find((x) => x.id === e.from) ?? [])
  if (fedBy.some((q) => q.kind === "queue" && !q.practices?.dlq))
    scaleCapacity(m, 1 / POISON_CAPACITY)
}

/** Re-judge a component as if its capacity were divided by `k`. */
function scaleCapacity(m: ComponentMetrics, k: number) {
  const before = m.utilization
  const u = before * k
  const total = m.readRps + m.writeRps
  m.utilization = u
  m.droppedRps = u > 1 ? total * (1 - 1 / u) : 0
  const inflation =
    u >= 1
      ? LATENCY_INFLATION_CAP
      : Math.min(LATENCY_INFLATION_CAP, 1 / (1 - u))
  const was =
    before >= 1
      ? LATENCY_INFLATION_CAP
      : Math.min(LATENCY_INFLATION_CAP, 1 / (1 - before))
  m.p99Ms = (m.p99Ms / was) * inflation
}

/**
 * A sharded store, judged by its busiest shard. Each shard has one shard's
 * capacity, so a key that puts most of the traffic in one place saturates it
 * however many shards there are. Reads that don't name the key go to all of
 * them, and wait for the slowest.
 */
function shard(
  m: ComponentMetrics,
  c: PlacedComponent,
  key: PartitionKey,
  flow: Flow,
  up: number,
) {
  const spec = CATALOGUE[c.kind]
  if (c.kind === "nosql") return keyLimited(m, key, flow, up)
  const n = Math.max(1, c.shards ?? 1)
  const units = up > 0 ? 1 : 0
  const hot = n === 1 ? 1 : Math.max(1 / n, Math.min(1, key.hotShare))
  const rest = n === 1 ? 0 : (1 - hot) / (n - 1)
  const s = key.scatterReads
  const readCap = spec.capacity.readRps * units
  const writeCap = spec.capacity.writeRps * units
  const at = (share: number) => ({
    reads: flow.reads * ((1 - s) * share + s),
    writes: flow.writes * share,
  })
  const over = (share: number) => {
    const l = at(share)
    return Math.max(0, l.reads - readCap) + Math.max(0, l.writes - writeCap)
  }
  const busiest = at(hot)
  const rho = (load: number, cap: number) =>
    load <= 0 ? 0 : cap <= 0 ? Infinity : load / cap
  const utilization = Math.max(
    rho(busiest.reads, readCap),
    rho(busiest.writes, writeCap),
  )
  const inflation =
    utilization >= 1
      ? LATENCY_INFLATION_CAP
      : Math.min(LATENCY_INFLATION_CAP, 1 / (1 - utilization))
  const scatter =
    n > 1 && s >= P99_PATH_SHARE
      ? spec.baseLatency.p99Ms * SCATTER_P99_FACTOR * Math.log2(n)
      : 0
  m.utilization = utilization
  m.p99Ms = spec.baseLatency.p99Ms * inflation + scatter
  m.droppedRps = over(hot) + (n - 1) * over(rest)
  const quiet = at(rest)
  m.shards = n
  m.hotShardShare = hot
  m.restShardUtilization =
    n === 1
      ? utilization
      : Math.max(rho(quiet.reads, readCap), rho(quiet.writes, writeCap))
}

/**
 * A {nosql} store, keyed. Its blocks of capacity are spread across every
 * partition, so the table as a whole scales; but any one key has a ceiling of
 * its own, so a key that takes a large share of the traffic is throttled
 * however many blocks there are. Reads that don't name the key scan every
 * partition.
 */
function keyLimited(
  m: ComponentMetrics,
  key: PartitionKey,
  flow: Flow,
  up: number,
) {
  const spec = CATALOGUE.nosql
  const blocks = Math.max(0, up)
  const s = key.scatterReads
  const fanout = key.scatterFanout ?? Math.max(1, blocks)
  const reads = flow.reads * (1 - s + s * fanout)
  const rho = (load: number, cap: number) =>
    load <= 0 ? 0 : cap <= 0 ? Infinity : load / cap
  const table = Math.max(
    rho(reads, spec.capacity.readRps * blocks),
    rho(flow.writes, spec.capacity.writeRps * blocks),
  )
  const hotReads = flow.reads * (1 - s) * key.hotShare
  const hotWrites = flow.writes * key.hotShare
  const hottest = Math.max(
    rho(hotReads, NOSQL_KEY_LIMIT.readRps),
    rho(hotWrites, NOSQL_KEY_LIMIT.writeRps),
  )
  const utilization = Math.max(table, hottest)
  const inflation =
    utilization >= 1
      ? LATENCY_INFLATION_CAP
      : Math.min(LATENCY_INFLATION_CAP, 1 / (1 - utilization))
  // Count refused requests, not the extra reads a scatter costs.
  const readCap = spec.capacity.readRps * blocks
  const tableDropped =
    (reads > readCap ? flow.reads * (1 - readCap / reads) : 0) +
    Math.max(0, flow.writes - spec.capacity.writeRps * blocks)
  const keyDropped =
    Math.max(0, hotReads - NOSQL_KEY_LIMIT.readRps) +
    Math.max(0, hotWrites - NOSQL_KEY_LIMIT.writeRps)
  m.utilization = utilization
  m.p99Ms = spec.baseLatency.p99Ms * inflation
  m.droppedRps = Math.max(tableDropped, keyDropped)
  m.shards = Math.max(1, blocks)
  m.hotShardShare = key.hotShare
  m.restShardUtilization = table
}

/**
 * Replication under the level's consistency choice. Normally, strong costs a
 * round trip to a second zone on every write. During a network split, the
 * side holding a majority of the copies carries on; strong refuses the rest,
 * eventual accepts them and lets the copies disagree.
 */
function replicate(
  m: ComponentMetrics,
  c: PlacedComponent,
  mode: Consistency,
  flow: Flow,
  split: boolean,
) {
  const d = copies(c)
  if (mode === "strong" && d >= 2) m.p99Ms += QUORUM_P99_MS
  if (!split) return
  const all = flow.reads + flow.writes
  // The split cuts off the zone holding a single copy, as an outage would.
  // With two copies, neither side holds a majority.
  if (d === 1 || (mode === "strong" && d === 2)) {
    m.refusedRps = all
  } else if (mode === "strong") {
    m.refusedRps = all / d
  } else {
    m.divergentRps = flow.writes / d
  }
  m.droppedRps = Math.min(all, m.droppedRps + (m.refusedRps ?? 0))
}
