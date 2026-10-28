import type { ConceptId } from "~/levels/concepts"
import { CATALOGUE } from "./catalogue"
import type {
  ComponentKind,
  Graph,
  LoadProfile,
  PlacedComponent,
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
      // {cdn}; anything else in a store, or put on a queue, goes through code.
      const from = byId.get(e.from)
      const files =
        to.kind === "object-store" &&
        (e.from === CLIENT_ID || from?.kind === "cdn")
      if (
        (spec.category === "data" || spec.async) &&
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
  // Duplicates from a component reached several ways say the same thing once.
  return out.filter((p, i) => out.findIndex((q) => q.text === p.text) === i)
}
