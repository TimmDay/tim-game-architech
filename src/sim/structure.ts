import type { ConceptId } from "~/levels/concepts"
import { CATALOGUE } from "./catalogue"
import { carries } from "./simulate"
import type {
  ComponentKind,
  Graph,
  LoadProfile,
  PlacedComponent,
  SimResult,
} from "./types"
import { CLIENT_ID } from "./types"

/**
 * Designs the load test would pass but that couldn't run: users wired
 * straight to a database, a queue with nothing reading it into the store.
 * Each one fails the first star, with a sentence saying what's missing.
 */
export type StructureProblem = {
  componentId: string
  concept: ConceptId
  text: string
}

/** Spread requests over a tier's instances. Consumers pull, so they count too. */
const BALANCERS = new Set<ComponentKind>([
  "load-balancer",
  "api-gateway",
  "queue",
  "event-stream",
])
/** Hosted models: something has to build each prompt and hold the key. */
const MODELS = new Set<ComponentKind>(["llm-api", "llm-batch"])
/** Where requests run code: they need somewhere to read from. */
const REQUEST_TIERS = new Set<ComponentKind>(["app-server", "serverless"])
/** Run your code: what has to stand between users and a store. */
const CODE = new Set<ComponentKind>([
  "app-server",
  "serverless",
  "worker",
  "stream-processor",
  "api-gateway",
])
/**
 * Where a hand-off may deliver without code of yours: managed loaders and
 * connectors write into a warehouse, object storage or a search index. A
 * store of record or someone else's API needs code that decides what to do.
 */
const LOADED_DIRECT = new Set<ComponentKind>([
  "data-warehouse",
  "object-store",
  "search-index",
])

const name = (c: PlacedComponent) => `{${c.kind}}`

export function structureProblems(
  graph: Graph,
  load: LoadProfile,
  /** The peak run, when there is one: rule 4 needs to know who gets reads. */
  peak?: SimResult,
): StructureProblem[] {
  const byId = new Map(graph.components.map((c) => [c.id, c]))
  const out: StructureProblem[] = []
  const typed = new Set((load.traffic ?? []).map((t) => t.id))
  /** A line users send a traffic type straight down: a signed URL, say. */
  const direct = (from: string, carries?: string[]) =>
    from === CLIENT_ID &&
    (carries ?? []).length > 0 &&
    (carries ?? []).every((x) => typed.has(x))

  // 1. Several app servers need something to share requests between them.
  for (const c of graph.components) {
    if (c.kind !== "app-server" || c.instances < 2) continue
    const unbalanced = graph.edges.some((e) => {
      if (e.to !== c.id) return false
      const from = byId.get(e.from)
      return !from || !BALANCERS.has(from.kind)
    })
    if (unbalanced)
      out.push({
        componentId: c.id,
        concept: "horizontal-scaling",
        text: `${name(c)} has ${c.instances} instances but is reached without a {load-balancer}, so nothing shares requests between them or stops sending to one that's down.`,
      })
  }

  // 2. Users can't talk to a store: code goes in front of it. Files and
  // signed URLs are the exception, and so is a cache's own store behind it.
  const seen = new Set<string>()
  const walk = (id: string, coded: boolean) => {
    for (const e of graph.edges) {
      if (e.from !== id) continue
      const to = byId.get(e.to)
      if (!to) continue
      const key = `${to.id}:${coded}`
      if (seen.has(key)) continue
      seen.add(key)
      const spec = CATALOGUE[to.kind]
      // Files can be served to users from a bucket, directly or through a
      // {cdn}; anything else in a store, on a queue or sent to a model goes
      // through code, which holds the keys.
      const from = byId.get(e.from)
      const files =
        to.kind === "object-store" &&
        (e.from === CLIENT_ID || from?.kind === "cdn")
      if (
        (spec.category === "data" || spec.async || MODELS.has(to.kind)) &&
        !coded &&
        !files &&
        !direct(e.from, e.carries)
      ) {
        out.push({
          componentId: to.id,
          concept: "critical-path",
          text: `Users reach ${name(to)} with no code in front of it: nothing checks who's asking or what they may change. Put an {app-server} or {serverless} tier in between.`,
        })
        continue
      }
      if (spec.async) continue
      walk(to.id, coded || CODE.has(to.kind))
    }
  }
  walk(CLIENT_ID, false)

  // 3. A queue or stream only holds messages: something has to act on them.
  for (const c of graph.components) {
    if (!CATALOGUE[c.kind].async) continue
    for (const e of graph.edges) {
      if (e.from !== c.id) continue
      const to = byId.get(e.to)
      if (!to || CODE.has(to.kind) || CATALOGUE[to.kind].async) continue
      // A queue of slow jobs (resizing, rendering) needs something to do
      // them; a loader can only copy what's already done.
      const jobs = c.kind === "queue" && load.heavyWriteFraction > 0
      if (LOADED_DIRECT.has(to.kind) && !jobs) continue
      out.push({
        componentId: to.id,
        concept: "competing-consumers",
        text: `${name(c)} hands messages straight to ${name(to)}, but nothing runs to act on them. Put a {worker} in between to take each message and do the work.`,
      })
    }
  }
  // 7. A model is called by code that builds the prompt, or by a {cache}
  // in front of that code's calls; a timer or a queue can't write a prompt.
  for (const c of graph.components) {
    if (!MODELS.has(c.kind)) continue
    for (const e of graph.edges) {
      if (e.to !== c.id) continue
      const from = byId.get(e.from)
      if (!from || CODE.has(from.kind) || from.kind === "cache") continue
      out.push({
        componentId: c.id,
        concept: "async-processing",
        text: `${name(from)} sends work straight to ${name(c)}, but something has to build each prompt and read the answers. Put a {worker} in between.`,
      })
    }
  }

  // 5. A store answers; it doesn't pass requests on. A {cache} in front of
  // its store does, and a store may publish its changes to a stream.
  for (const c of graph.components) {
    const spec = CATALOGUE[c.kind]
    if (spec.category !== "data" || spec.caches) continue
    for (const e of graph.edges) {
      const to = e.from === c.id ? byId.get(e.to) : undefined
      if (!to || CATALOGUE[to.kind].async) continue
      out.push({
        componentId: c.id,
        concept: "cache-aside",
        text: `${name(c)} is wired on to ${name(to)}, but a store answers requests; it doesn't pass them on. Have the code that calls it call ${name(to)} too.`,
      })
    }
  }
  // 6. A {cache} with nothing behind it only works when everything it's asked
  // was put there ahead of time.
  if (load.cacheableFraction < 1)
    for (const c of graph.components) {
      if (c.kind !== "cache") continue
      if (!graph.edges.some((e) => e.to === c.id)) continue
      if (graph.edges.some((e) => e.from === c.id)) continue
      out.push({
        componentId: c.id,
        concept: "cache-aside",
        text: `${name(c)} has nothing behind it, so a request it hasn't seen has no answer. Put the store it caches behind it.`,
      })
    }

  // 8. A {cache} straight in front of another one adds nothing a bigger
  // one wouldn't: the second sees only what the first already missed.
  for (const e of graph.edges) {
    const from = byId.get(e.from)
    const to = byId.get(e.to)
    if (from?.kind === "cache" && to?.kind === "cache")
      out.push({
        componentId: to.id,
        concept: "cache-aside",
        text: `${name(to)} sits straight behind another {cache}, so it only sees what the first one missed. Make the first one bigger instead.`,
      })
  }

  // 4. Code that's asked for something must have somewhere to read it from.
  if (peak)
    for (const c of graph.components) {
      if (!REQUEST_TIERS.has(c.kind)) continue
      if ((peak.perComponent[c.id]?.readRps ?? 0) <= 0) continue
      const reads = graph.edges.some((e) => {
        if (e.from !== c.id || !byId.has(e.to)) return false
        const what = carries(graph, e)
        return what === "all" || what === "reads"
      })
      if (!reads)
        out.push({
          componentId: c.id,
          concept: "cache-aside",
          text: `${name(c)} is asked for ${Math.round(peak.perComponent[c.id]?.readRps ?? 0).toLocaleString("en-US")} reads a second but has nowhere to read them from. Connect it to the store or {cache} that holds the answers.`,
        })
    }

  // Duplicates from a component reached several ways say the same thing once.
  return out.filter((p, i) => out.findIndex((q) => q.text === p.text) === i)
}
