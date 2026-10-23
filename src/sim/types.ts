/**
 * The game's data model. Plain data, no React: `simulate()` is a pure function
 * over these types, so everything the canvas shows is a render of its output.
 */

export type ComponentKind =
  | "dns"
  | "cdn"
  | "load-balancer"
  | "api-gateway"
  | "app-server"
  | "serverless"
  | "cache"
  | "sql-primary"
  | "sql-replica"
  | "nosql"
  | "queue"
  | "event-stream"
  | "worker"
  | "object-store"
  | "search-index"
  | "data-warehouse"

export type Category = "edge" | "compute" | "data" | "messaging"

/**
 * The traffic source. Not a ComponentKind: every board has exactly one, and
 * the player wires out of it rather than placing it.
 */
export const CLIENT_ID = "client"

export type ComponentSpec = {
  kind: ComponentKind
  category: Category
  /** Per instance. Split because a primary and a replica differ on writes, not reads. */
  capacity: { readRps: number; writeRps: number }
  baseLatency: { p50Ms: number; p99Ms: number }
  /** One instance in one failure domain. Managed services: the provider SLA. */
  baselineAvailability: number
  /**
   * The provider runs the redundancy for you: zones are not your problem and a
   * zone outage does not take it down.
   */
  managed: boolean
  /**
   * Losing it degrades the system rather than breaking it (a cache falls back to
   * the database). Excluded from the availability product.
   */
  optionalOnPath: boolean
  /**
   * Routers divide traffic between their outgoing edges. Callers make every
   * outgoing call per request, so each edge carries the full flow.
   */
  routesTraffic: boolean
  /** Serves hits itself and passes only misses (and all writes) onward. */
  caches: boolean
  /**
   * Hands work off asynchronously. Whatever is downstream of it is off the
   * user's critical path: slow consumers grow a backlog instead of failing requests.
   */
  async: boolean
  /** Event streams deliver every message to every consumer; queues share them out. */
  broadcasts: boolean
  /** Can't accept writes at all. Routing writes here is a detectable mistake. */
  readOnly: boolean
  /** False for a SQL primary: more instances are standbys, not more capacity. */
  scalesOut: boolean
  costPerInstanceMonthUsd: number
  maxInstances: number
}

export type PlacedComponent = {
  id: string
  kind: ComponentKind
  /** Isometric tile coordinates. */
  x: number
  y: number
  instances: number
  /** Failure domains the instances are spread across. Ignored for managed specs. */
  zones: number
}

export type Edge = {
  id: string
  from: string
  to: string
}

export type Graph = {
  components: PlacedComponent[]
  edges: Edge[]
}

export type LoadProfile = {
  peakRps: number
  /** Fraction of requests that are reads. */
  readFraction: number
  /** Fraction of reads a cache or CDN can serve, given the scenario's data. */
  cacheableFraction: number
  /**
   * Fraction of the workload's writes that are heavy jobs (image resizing,
   * PDF rendering). Done synchronously, they sit on the user's critical path.
   */
  heavyWriteFraction: number
}

export type Fault =
  /** One instance of every component of this kind crashes. */
  | { kind: "kill-instance"; target: ComponentKind }
  | { kind: "zone-outage" }
  | { kind: "traffic-spike"; multiplier: number }

export type ComponentMetrics = {
  readRps: number
  writeRps: number
  utilization: number
  p99Ms: number
  droppedRps: number
  aliveInstances: number
  /** Downstream of an async hand-off: overload shows as backlog, not errors. */
  behindAsync: boolean
}

export type SimResult = {
  perComponent: Record<string, ComponentMetrics>
  perEdge: Record<string, { rps: number; async: boolean }>
  offeredRps: number
  p99Ms: number
  errorRate: number
  availability: number
  monthlyCostUsd: number
  /** Messages per second arriving faster than consumers can take them. */
  backlogGrowthRps: number
  /** Something is wired up from the client at all. */
  connected: boolean
}
