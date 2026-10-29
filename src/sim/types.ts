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
  // Sandbox only, for diagramming: no level uses these yet.
  | "realtime-gateway"
  | "pubsub"
  | "push-service"
  | "stream-processor"
  | "scheduler"
  | "time-series-db"
  | "coordination"
  | "graph-db"
  | "vector-db"
  | "rate-limiter"
  | "auth-service"
  // A hosted model, called while someone waits, or in bulk at half price.
  | "llm-api"
  | "llm-batch"

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
  /**
   * Usage pricing, per million reads and writes it handles. Managed services
   * (queues, gateways, functions, object storage, OCR) are billed this way.
   * Costed from the traffic at peak, scaled down to an average month.
   */
  costPerMillion?: { reads: number; writes: number }
  /**
   * Model APIs: one instance is a block of quota, in tokens a second, and
   * calls are billed per token. With the level's tokens per call these set
   * how many calls a second a block takes, and what each one costs.
   */
  tokensPerSecond?: number
  costPerMillionTokens?: { input: number; output: number }
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
   * Regions (continents, roughly) it runs in. Offered only in levels that
   * declare regions. Compute splits its instances between them; a store or
   * load balancer runs a full copy in each.
   */
  regions?: number
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
  /**
   * In a {nosql} store, how many reads one scattered read costs: ten for a
   * counter split over ten keys, far more for a scan of the whole table.
   * Absent: one read per block.
   */
  scatterFanout?: number
}

export type Edge = {
  id: string
  from: string
  to: string
  /**
   * What the player says this connection carries: "reads", "writes", and any
   * of the level's traffic types. Unset: inferred from its two ends.
   */
  carries?: string[]
}

/**
 * A slice of a level's traffic with a name and a cost of its own, such as
 * file chunks. Users can send it straight to a store over a connection
 * marked with its id (a signed URL); otherwise the app tier relays it.
 */
export type TrafficType = {
  id: string
  /** "File chunks". Shown in the connection's picker. */
  label: string
  /** Which half of the traffic it's part of. */
  of: "reads" | "writes"
  /** Its share of that half. */
  share: number
  /** What relaying one costs a request tier, in ordinary requests. */
  relayCost: number
  /** The kinds users may send it to directly. */
  to: ComponentKind[]
  /**
   * The same files for everyone (a launch video), so a {cdn} sent it directly
   * serves it from its edge. Unset: every request is different.
   */
  cacheable?: boolean
}

export type Graph = {
  components: PlacedComponent[]
  edges: Edge[]
  /** Where the Users block sits, once moved. Unset: CLIENT_TILE. Layout only. */
  client?: { x: number; y: number }
  /** The player's own notes. The engine never reads them. */
  notes?: Note[]
}

/** A note on the board, at a free point in board space (not a tile). */
export type Note = { id: string; x: number; y: number; text: string }

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
   * How long one heavy job keeps a worker busy, in seconds. CPU-bound jobs
   * (resizing, rendering) use a core each; waiting jobs (calling a slow API)
   * can run many at once. Unset: a generic short job.
   */
  job?: {
    seconds: number
    cpuBound: boolean
    /**
     * Writes a worker passes on per job, when that isn't one: counting a
     * minute of clicks per ad turns thousands of events into one write.
     */
    emits?: number
  }
  /**
   * Average traffic over a month as a share of this peak, for usage billing.
   * Unset: AVERAGE_OF_PEAK. A seasonal product (a tax deadline) is far lower.
   */
  averageOfPeak?: number
  /**
   * Partition keys the scenario offers. Absent (every level before the CAP
   * shelf), stores aren't sharded and the engine behaves as it always has.
   */
  partitionKeys?: PartitionKey[]
  /** Stores can choose a consistency mode, and a network split tests it. */
  tunableConsistency?: boolean
  /** Named slices of the traffic that users can send somewhere directly. */
  traffic?: TrafficType[]
  /**
   * The level offers regions. `farShare`: the share of users on another
   * continent from the home region, who pay `rttMs` on every request unless
   * everything they touch runs near them too. 0: everyone is close, so a
   * second region only buys survival of a region outage.
   */
  regions?: { farShare: number; rttMs: number }
  /**
   * This account's quota on a service, in instances, where it's below the
   * catalogue's maximum: a push quota the provider hasn't raised yet.
   */
  quota?: Partial<Record<ComponentKind, number>>
  /**
   * Tokens in one model call: the prompt (question, retrieved passages,
   * instructions) and the answer. Unset: the level calls no model.
   */
  tokens?: { input: number; output: number }
  /**
   * Work a clock starts, not a user: tomorrow's appointment reminders, sent
   * when they fall due. A component of one of the `by` kinds with nothing
   * wired into it runs the timer. Each running instance does the work in
   * full, so it must reach `to` exactly once: elect one leader through a
   * {coordination} cluster, or let a {scheduler} start it.
   */
  timed?: {
    /** "Appointment reminders". */
    label: string
    rps: number
    by: ComponentKind[]
    to: ComponentKind[]
  }
}

export type Fault =
  /** One instance of every component of this kind crashes. */
  | { kind: "kill-instance"; target: ComponentKind }
  | { kind: "zone-outage" }
  /** A whole region goes dark: everything that runs only there is gone. */
  | { kind: "region-outage" }
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
  /**
   * A flood at `multiplier` times normal traffic: stolen passwords being
   * tried, or a runaway client. `perKey`: it comes from many addresses under
   * a few API keys, so only something that reads the key can limit it.
   */
  | { kind: "credential-stuffing"; multiplier: number; perKey?: boolean }
  /**
   * A provider's outage: the first component of this kind (in the order it
   * was placed) is down entirely, whatever its quota.
   */
  | { kind: "provider-outage"; target: ComponentKind }
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
  /** Of its writes, how many are the level's timed work. */
  timedRps?: number
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
  /** Reads that caches answered themselves. */
  cacheHitRps: number
  /**
   * The level's timed work: how much the timers started (the same item
   * started by several of them counts each time), how much reached its
   * destination, and how many timers ran it.
   */
  timed?: { started: number; delivered: number; runners: number }
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
