import {
  CATALOGUE,
  HEAVY_JOB_COST,
  HEAVY_JOB_P99_MS,
  LATENCY_INFLATION_CAP,
} from "./catalogue"
import type {
  ComponentMetrics,
  Edge,
  Fault,
  Graph,
  LoadProfile,
  PlacedComponent,
  SimResult,
} from "./types"
import { CLIENT_ID } from "./types"

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
export function aliveInstances(c: PlacedComponent, faults: Fault[]): number {
  const spec = CATALOGUE[c.kind]
  let alive = c.instances
  for (const f of faults) {
    if (f.kind === "kill-instance" && f.target === c.kind) alive -= 1
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
export function doesHeavyWorkInline(graph: Graph, c: PlacedComponent): boolean {
  const spec = CATALOGUE[c.kind]
  if (spec.category !== "compute" || c.kind === "worker") return false
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

export function monthlyCost(graph: Graph): number {
  return graph.components.reduce(
    (sum, c) => sum + CATALOGUE[c.kind].costPerInstanceMonthUsd * c.instances,
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
  const alive = new Map(
    graph.components.map((c) => [c.id, aliveInstances(c, faults)]),
  )
  const asyncSet = behindAsync(graph)
  const multiplier = faults.reduce(
    (m, f) => (f.kind === "traffic-spike" ? m * f.multiplier : m),
    1,
  )
  const offered = load.peakRps * multiplier
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
      const f: Flow = {
        reads: flow.reads * readShare,
        writes: flow.writes * writeShare,
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
      ? 1 + load.heavyWriteFraction * (HEAVY_JOB_COST - 1)
      : 1
    const readCap = spec.capacity.readRps * units
    const writeCap = (spec.capacity.writeRps * units) / writeCost
    const rho = (load: number, cap: number) =>
      load <= 0 ? 0 : cap <= 0 ? Infinity : load / cap
    const utilization = Math.max(
      rho(flow.reads, readCap),
      rho(flow.writes, writeCap),
    )
    const inflation =
      utilization >= 1
        ? LATENCY_INFLATION_CAP
        : Math.min(LATENCY_INFLATION_CAP, 1 / (1 - utilization))
    const heavyP99 = inline && flow.writes > 0 ? HEAVY_JOB_P99_MS : 0
    perComponent[c.id] = {
      readRps: flow.reads,
      writeRps: flow.writes,
      utilization,
      p99Ms: spec.baseLatency.p99Ms * inflation + heavyP99,
      droppedRps:
        Math.max(0, flow.reads - readCap) + Math.max(0, flow.writes - writeCap),
      aliveInstances: up,
      behindAsync: isAsync,
    }
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

  return {
    perComponent,
    perEdge,
    offeredRps: offered,
    p99Ms: connected
      ? criticalPathP99(graph, perComponent, perEdge, offered)
      : 0,
    errorRate,
    availability: topologyAvailability(graph, asyncSet),
    monthlyCostUsd: monthlyCost(graph),
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
    a *= 1 - Math.pow(1 - spec.baselineAvailability, failureDomains(c))
  }
  return a
}
