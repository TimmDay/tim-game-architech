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
  | "doc-ai"
  | "third-party-api"

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
  /**
   * Shards the data is split into, each with its own primary and standbys.
   * Only a {sql-primary} in a level that offers partition keys uses it.
   */
  shards?: number
  /** Which of the level's partition keys the data is split by. */
  partitionKey?: string
  /** What the store does when a network split leaves its copies apart. */
  consistency?: Consistency
  /**
   * Production settings from the sidebar. Grading checks them for the third
   * star; they only change the simulation under the incident faults.
   */
  practices?: Practices
}

/**
 * The settings a real deployment needs that a load test can't see: backups,
 * encryption, auth, rate limits, timeouts and retries, dead-letter queues,
 * idempotency and alerts. Grading checks them against what the level's stakes
 * call for (`~/sim/practices`).
 */
export type Practices = {
  /** Unset: no backups. Daily restores to last night; point-in-time to the minute. */
  backups?: "daily" | "point-in-time"
  encrypted?: boolean
  auth?: boolean
  rateLimit?: boolean
  timeouts?: boolean
  /** Unset: no retries. Immediate retries pile onto a struggling dependency. */
  retries?: "immediate" | "backoff"
  dlq?: boolean
  idempotency?: boolean
  alerts?: boolean
}

/**
 * Strong: a write commits only once a majority of copies have it, so during a
 * split the side without a majority refuses. Eventual: every copy accepts
 * writes and they're reconciled later, so nobody is refused but the copies
 * disagree for a while.
 */
export type Consistency = "strong" | "eventual"

/** One way a level's data could be split, and what that does to its load. */
export type PartitionKey = {
  id: string
  /** "Account ID". Shown in the sidebar dropdown. */
  label: string
  /**
   * Share of all traffic on the busiest single key. The busiest shard gets at
   * least this, however many shards there are. 0: spread evenly.
   */
  hotShare: number
  /** Share of reads that don't name the key, so they ask every shard. */
  scatterReads: number
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
  /**
   * Partition keys the scenario offers. Absent (every level before the CAP
   * shelf), stores aren't sharded and the engine behaves as it always has.
   */
  partitionKeys?: PartitionKey[]
  /** Stores can choose a consistency mode, and a network split tests it. */
  tunableConsistency?: boolean
}

export type Fault =
  /** One instance of every component of this kind crashes. */
  | { kind: "kill-instance"; target: ComponentKind }
  | { kind: "zone-outage" }
  | { kind: "traffic-spike"; multiplier: number }
  /**
   * One zone loses contact with the others. Nothing crashes: every machine is
   * up, but copies of the data on either side can't reach each other. Only
   * stores whose consistency is tunable notice.
   */
  | { kind: "network-split" }
  /**
   * Every call into components of this kind takes `extraMs` longer. Callers
   * without timeouts hold their threads for all of it; immediate retries
   * multiply the calls.
   */
  | { kind: "slow-dependency"; target: ComponentKind; extraMs: number }
  /** Some messages fail every time. Without a dead-letter queue they're retried forever. */
  | { kind: "poison-message" }
  /** Attackers try stolen passwords at `multiplier` times normal traffic. */
  | { kind: "credential-stuffing"; multiplier: number }
  /** Someone calls the API without signing in. */
  | { kind: "unauthenticated-probe" }
  /** A bad migration corrupts the system of record and it must be restored. */
  | { kind: "bad-migration" }
  /**
   * Components of this kind hang without crashing: health checks pass, no
   * work gets done. With alerts, someone replaces the stuck instance.
   */
  | { kind: "silent-stall"; target: ComponentKind }

export type ComponentMetrics = {
  readRps: number
  writeRps: number
  utilization: number
  p99Ms: number
  droppedRps: number
  aliveInstances: number
  /** Downstream of an async hand-off: overload shows as backlog, not errors. */
  behindAsync: boolean
  /** Sharded stores: how many, and the busiest one's share of the traffic. */
  shards?: number
  hotShardShare?: number
  /** Utilisation of each of the other shards, next to the busiest one's. */
  restShardUtilization?: number
  /** Network split: requests refused for want of a majority. */
  refusedRps?: number
  /** Network split: writes accepted on the minority side. */
  divergentRps?: number
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
  /**
   * Writes accepted on the minority side of a network split, which the other
   * side doesn't see until it heals: conflicts to reconcile later.
   */
  divergentRps: number
  /** Writes applied twice: retries without idempotency keys, during a slow dependency. */
  duplicateRps: number
  /** After a bad migration: the most recent data lost by the restore. 0 if no migration. */
  dataLossMinutes: number
  /** During an unauthenticated probe: components that answered it. */
  exposed: string[]
  /** Something is wired up from the client at all. */
  connected: boolean
}
