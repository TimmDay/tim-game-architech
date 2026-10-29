import type { ComponentKind, ComponentSpec, LoadProfile } from "./types"

/**
 * The numbers every grade rests on: one instance of each component, at a
 * realistic size and price. They're approximate (on-demand list prices and
 * typical throughput for the size named in each comment), but they're the
 * right order of magnitude, so what the game teaches about capacity and cost
 * holds in an interview too.
 *
 * Managed services billed per request carry `costPerMillion`, which is costed
 * from each level's traffic (see `monthlyUsageUsd`).
 *
 * Display names are not here. They depend on the provider toggle and live in
 * `~/providers/names.ts`.
 */
const base = {
  managed: false,
  optionalOnPath: false,
  routesTraffic: false,
  caches: false,
  async: false,
  broadcasts: false,
  readOnly: false,
  scalesOut: true,
  maxInstances: 20,
} as const

export const CATALOGUE: Record<ComponentKind, ComponentSpec> = {
  dns: {
    ...base,
    kind: "dns",
    category: "edge",
    // Resolvers cache answers, so DNS is close to free per request.
    capacity: { readRps: 1_000_000, writeRps: 1_000_000 },
    baseLatency: { p50Ms: 1, p99Ms: 4 },
    baselineAvailability: 0.99999,
    managed: true,
    routesTraffic: true,
    costPerInstanceMonthUsd: 1,
    maxInstances: 1,
  },
  cdn: {
    ...base,
    kind: "cdn",
    category: "edge",
    // Edge networks are built for millions of requests a second. Billed per
    // request (bandwidth, the bigger real cost, isn't modelled).
    capacity: { readRps: 1_000_000, writeRps: 1_000_000 },
    baseLatency: { p50Ms: 8, p99Ms: 35 },
    baselineAvailability: 0.9999,
    managed: true,
    optionalOnPath: true,
    routesTraffic: true,
    caches: true,
    costPerInstanceMonthUsd: 0,
    costPerMillion: { reads: 1, writes: 1 },
    maxInstances: 1,
  },
  "load-balancer": {
    ...base,
    kind: "load-balancer",
    category: "edge",
    // A managed application load balancer: a base fee plus capacity units.
    capacity: { readRps: 50_000, writeRps: 50_000 },
    baseLatency: { p50Ms: 2, p99Ms: 8 },
    baselineAvailability: 0.9999,
    managed: true,
    routesTraffic: true,
    costPerInstanceMonthUsd: 25,
    costPerMillion: { reads: 0.01, writes: 0.01 },
    maxInstances: 4,
  },
  "api-gateway": {
    ...base,
    kind: "api-gateway",
    category: "edge",
    // 10,000 a second is a typical default account throttle. Billed per call.
    capacity: { readRps: 10_000, writeRps: 10_000 },
    baseLatency: { p50Ms: 5, p99Ms: 20 },
    baselineAvailability: 0.9995,
    managed: true,
    routesTraffic: true,
    costPerInstanceMonthUsd: 0,
    costPerMillion: { reads: 1, writes: 1 },
    maxInstances: 4,
  },
  "app-server": {
    ...base,
    kind: "app-server",
    category: "compute",
    // A 2 vCPU, 4 GB container doing simple API work: about 2ms of CPU each.
    capacity: { readRps: 1_000, writeRps: 1_000 },
    baseLatency: { p50Ms: 20, p99Ms: 80 },
    baselineAvailability: 0.99,
    costPerInstanceMonthUsd: 70,
    maxInstances: 60,
  },
  serverless: {
    ...base,
    kind: "serverless",
    category: "compute",
    // One "instance" is a block of 1,000 concurrent executions of ~100ms
    // functions. Billed per invocation and duration; cold starts show in p99.
    capacity: { readRps: 10_000, writeRps: 10_000 },
    baseLatency: { p50Ms: 25, p99Ms: 400 },
    baselineAvailability: 0.9995,
    managed: true,
    costPerInstanceMonthUsd: 0,
    costPerMillion: { reads: 0.4, writes: 0.4 },
    maxInstances: 10,
  },
  cache: {
    ...base,
    kind: "cache",
    category: "data",
    // One in-memory node with about 13 GB.
    capacity: { readRps: 100_000, writeRps: 100_000 },
    baseLatency: { p50Ms: 1, p99Ms: 3 },
    baselineAvailability: 0.995,
    optionalOnPath: true,
    caches: true,
    costPerInstanceMonthUsd: 150,
    maxInstances: 6,
  },
  "sql-primary": {
    ...base,
    kind: "sql-primary",
    category: "data",
    // A 4 vCPU, 32 GB database doing simple indexed queries.
    capacity: { readRps: 10_000, writeRps: 3_000 },
    baseLatency: { p50Ms: 5, p99Ms: 30 },
    baselineAvailability: 0.995,
    // Extra instances are standbys: another failure domain, no extra capacity.
    scalesOut: false,
    costPerInstanceMonthUsd: 400,
    maxInstances: 3,
  },
  "sql-replica": {
    ...base,
    kind: "sql-replica",
    category: "data",
    capacity: { readRps: 10_000, writeRps: 0 },
    baseLatency: { p50Ms: 5, p99Ms: 30 },
    baselineAvailability: 0.995,
    optionalOnPath: true,
    readOnly: true,
    costPerInstanceMonthUsd: 400,
    maxInstances: 5,
  },
  nosql: {
    ...base,
    kind: "nosql",
    category: "data",
    // One block of provisioned throughput. Any single key is capped lower
    // still (NOSQL_KEY_LIMIT), however many blocks you buy.
    capacity: { readRps: 5_000, writeRps: 1_000 },
    baseLatency: { p50Ms: 4, p99Ms: 15 },
    baselineAvailability: 0.9999,
    managed: true,
    costPerInstanceMonthUsd: 950,
    maxInstances: 40,
  },
  queue: {
    ...base,
    kind: "queue",
    category: "messaging",
    // Effectively unlimited. Each message is a send, a receive and a delete.
    capacity: { readRps: 100_000, writeRps: 100_000 },
    baseLatency: { p50Ms: 5, p99Ms: 20 },
    baselineAvailability: 0.9999,
    managed: true,
    // Competing consumers: each message goes to ONE of them.
    routesTraffic: true,
    async: true,
    costPerInstanceMonthUsd: 0,
    costPerMillion: { reads: 1.2, writes: 1.2 },
    maxInstances: 1,
  },
  "event-stream": {
    ...base,
    kind: "event-stream",
    category: "messaging",
    // One shard or partition: about 1,000 events a second in.
    capacity: { readRps: 1_000_000, writeRps: 1_000 },
    baseLatency: { p50Ms: 5, p99Ms: 25 },
    baselineAvailability: 0.9995,
    managed: true,
    // Every consumer group sees every event.
    async: true,
    broadcasts: true,
    costPerInstanceMonthUsd: 25,
    maxInstances: 50,
  },
  worker: {
    ...base,
    kind: "worker",
    category: "compute",
    // A 4 vCPU instance. Its throughput depends on the job: see workerJobsPerSecond.
    capacity: { readRps: 50, writeRps: 50 },
    baseLatency: { p50Ms: 400, p99Ms: 1_800 },
    baselineAvailability: 0.99,
    costPerInstanceMonthUsd: 120,
    maxInstances: 60,
  },
  "object-store": {
    ...base,
    kind: "object-store",
    category: "data",
    // Requests per second per key prefix: popular files share one, so this is
    // the limit that bites. Billed per request, plus storage.
    capacity: { readRps: 5_500, writeRps: 3_500 },
    baseLatency: { p50Ms: 20, p99Ms: 80 },
    baselineAvailability: 0.9999,
    managed: true,
    costPerInstanceMonthUsd: 25,
    costPerMillion: { reads: 0.4, writes: 5 },
    maxInstances: 1,
  },
  "search-index": {
    ...base,
    kind: "search-index",
    category: "data",
    // One search node.
    capacity: { readRps: 2_000, writeRps: 5_000 },
    baseLatency: { p50Ms: 15, p99Ms: 60 },
    baselineAvailability: 0.999,
    optionalOnPath: true,
    costPerInstanceMonthUsd: 200,
    maxInstances: 10,
  },
  "data-warehouse": {
    ...base,
    kind: "data-warehouse",
    category: "data",
    // The smallest serious cluster: fast bulk loads, few small queries at once.
    capacity: { readRps: 20, writeRps: 50_000 },
    baseLatency: { p50Ms: 800, p99Ms: 4_000 },
    baselineAvailability: 0.999,
    managed: true,
    optionalOnPath: true,
    costPerInstanceMonthUsd: 1_000,
    maxInstances: 1,
  },
  "doc-ai": {
    ...base,
    kind: "doc-ai",
    category: "compute",
    // A managed OCR / document-extraction API. One "instance" is 10 calls a
    // second of quota; default quotas are often 1 to 5. Billed per page.
    capacity: { readRps: 10, writeRps: 10 },
    baseLatency: { p50Ms: 1_500, p99Ms: 4_000 },
    baselineAvailability: 0.999,
    managed: true,
    costPerInstanceMonthUsd: 0,
    costPerMillion: { reads: 10_000, writes: 10_000 },
    maxInstances: 20,
  },
  "third-party-api": {
    ...base,
    kind: "third-party-api",
    category: "compute",
    // Someone else's service: a payment provider, a carrier's rates API. One
    // "instance" is a block of 100 calls a second of the quota your contract
    // allows. Its fees are a business cost, not infrastructure, so it's free here.
    capacity: { readRps: 100, writeRps: 100 },
    baseLatency: { p50Ms: 150, p99Ms: 600 },
    baselineAvailability: 0.999,
    managed: true,
    costPerInstanceMonthUsd: 0,
    maxInstances: 20,
  },

  // --- Sandbox only, for diagramming. No level uses these yet, so their
  // numbers are rough orders of magnitude, not tuned against a reference.
  "realtime-gateway": {
    ...base,
    kind: "realtime-gateway",
    category: "edge",
    // Holds users' WebSocket connections open and relays messages both ways.
    // Billed per message (connection minutes, the other half, aren't modelled).
    capacity: { readRps: 10_000, writeRps: 10_000 },
    baseLatency: { p50Ms: 5, p99Ms: 25 },
    baselineAvailability: 0.9995,
    managed: true,
    routesTraffic: true,
    costPerInstanceMonthUsd: 0,
    costPerMillion: { reads: 1, writes: 1 },
    maxInstances: 10,
  },
  pubsub: {
    ...base,
    kind: "pubsub",
    category: "messaging",
    // A topic: every subscriber gets every message, pushed to it, with no
    // replay. Tens of thousands of publishes a second per topic.
    capacity: { readRps: 1_000_000, writeRps: 30_000 },
    baseLatency: { p50Ms: 10, p99Ms: 50 },
    baselineAvailability: 0.9999,
    managed: true,
    async: true,
    broadcasts: true,
    costPerInstanceMonthUsd: 0,
    costPerMillion: { reads: 0.5, writes: 0.5 },
    maxInstances: 1,
  },
  "push-service": {
    ...base,
    kind: "push-service",
    category: "compute",
    // Hands notifications to the phone platforms' push networks. Delivery
    // takes as long as they take, and isn't guaranteed. One instance is 1,000
    // sends a second of quota; ten is about one major service's default
    // (600,000 a minute per project). Levels can set a lower quota.
    capacity: { readRps: 1_000, writeRps: 1_000 },
    baseLatency: { p50Ms: 100, p99Ms: 800 },
    baselineAvailability: 0.999,
    managed: true,
    costPerInstanceMonthUsd: 0,
    costPerMillion: { reads: 0.5, writes: 0.5 },
    maxInstances: 10,
  },
  "stream-processor": {
    ...base,
    kind: "stream-processor",
    category: "compute",
    // One processing unit of a managed stream job: windowed counts and joins
    // over a few thousand events a second, with state kept between them.
    capacity: { readRps: 5_000, writeRps: 5_000 },
    baseLatency: { p50Ms: 50, p99Ms: 300 },
    baselineAvailability: 0.999,
    managed: true,
    costPerInstanceMonthUsd: 80,
    maxInstances: 40,
  },
  scheduler: {
    ...base,
    kind: "scheduler",
    category: "compute",
    // Fires jobs on a timetable at whatever it's wired to. Billed per trigger.
    // One major provider delivers 1,000 a second by default and delays the rest.
    capacity: { readRps: 1_000, writeRps: 1_000 },
    baseLatency: { p50Ms: 10, p99Ms: 60 },
    baselineAvailability: 0.9995,
    managed: true,
    routesTraffic: true,
    costPerInstanceMonthUsd: 0,
    costPerMillion: { reads: 1, writes: 1 },
    maxInstances: 1,
  },
  "time-series-db": {
    ...base,
    kind: "time-series-db",
    category: "data",
    // Built for appending timestamped points fast and reading them back by
    // time range: many more writes than reads.
    capacity: { readRps: 2_000, writeRps: 50_000 },
    baseLatency: { p50Ms: 5, p99Ms: 40 },
    baselineAvailability: 0.999,
    managed: true,
    costPerInstanceMonthUsd: 600,
    maxInstances: 10,
  },
  coordination: {
    ...base,
    kind: "coordination",
    category: "data",
    // A small cluster for locks, leader election and config, run yourself.
    // Every write needs a majority, so more nodes add safety, not capacity.
    capacity: { readRps: 10_000, writeRps: 2_000 },
    baseLatency: { p50Ms: 2, p99Ms: 15 },
    baselineAvailability: 0.995,
    scalesOut: false,
    costPerInstanceMonthUsd: 100,
    maxInstances: 5,
  },
  "graph-db": {
    ...base,
    kind: "graph-db",
    category: "data",
    // One instance answering short traversals: friends of friends, a few hops.
    capacity: { readRps: 5_000, writeRps: 1_000 },
    baseLatency: { p50Ms: 10, p99Ms: 60 },
    baselineAvailability: 0.999,
    managed: true,
    costPerInstanceMonthUsd: 700,
    maxInstances: 15,
  },
  "vector-db": {
    ...base,
    kind: "vector-db",
    category: "data",
    // Nearest-neighbour search over embeddings: approximate, and slower than
    // a key lookup. Billed per query, plus storage.
    capacity: { readRps: 1_000, writeRps: 1_000 },
    baseLatency: { p50Ms: 40, p99Ms: 150 },
    baselineAvailability: 0.999,
    managed: true,
    costPerInstanceMonthUsd: 50,
    costPerMillion: { reads: 2.5, writes: 0.2 },
    maxInstances: 10,
  },
  "rate-limiter": {
    ...base,
    kind: "rate-limiter",
    category: "edge",
    // Counts requests per caller at the edge and turns away the excess.
    capacity: { readRps: 100_000, writeRps: 100_000 },
    baseLatency: { p50Ms: 1, p99Ms: 5 },
    baselineAvailability: 0.9999,
    managed: true,
    routesTraffic: true,
    costPerInstanceMonthUsd: 5,
    costPerMillion: { reads: 0.6, writes: 0.6 },
    maxInstances: 1,
  },
  "auth-service": {
    ...base,
    kind: "auth-service",
    category: "compute",
    // Sign-in and token checks. Billed per monthly active user, which isn't
    // modelled, so it's free here; its quota is a few hundred calls a second.
    capacity: { readRps: 500, writeRps: 500 },
    baseLatency: { p50Ms: 30, p99Ms: 150 },
    baselineAvailability: 0.9995,
    managed: true,
    costPerInstanceMonthUsd: 0,
    maxInstances: 10,
  },
  "llm-api": {
    ...base,
    kind: "llm-api",
    category: "compute",
    // A hosted, mid-sized model. Quota is counted in tokens a minute, per
    // model and region; one instance is a block of a million (about 16,700 a
    // second). Billed per token, output several times input. The p99 is the
    // time to the first token of a long prompt; the answer streams after it.
    capacity: { readRps: 10, writeRps: 10 },
    baseLatency: { p50Ms: 600, p99Ms: 2_500 },
    baselineAvailability: 0.999,
    managed: true,
    costPerInstanceMonthUsd: 0,
    tokensPerSecond: 16_700,
    costPerMillionTokens: { input: 3, output: 15 },
    maxInstances: 20,
  },
  "llm-batch": {
    ...base,
    kind: "llm-batch",
    category: "compute",
    // The same models, sent as a file of requests and returned within about
    // a day, at about half the price, under a far larger quota of its own.
    capacity: { readRps: 100, writeRps: 100 },
    baseLatency: { p50Ms: 3_600_000, p99Ms: 86_400_000 },
    baselineAvailability: 0.999,
    managed: true,
    async: true,
    costPerInstanceMonthUsd: 0,
    tokensPerSecond: 167_000,
    costPerMillionTokens: { input: 1.5, output: 7.5 },
    maxInstances: 10,
  },
}

export const KINDS = Object.keys(CATALOGUE) as ComponentKind[]

/** The most instances of a kind this level allows: its quota, if lower. */
export const maxInstancesOf = (
  kind: ComponentKind,
  load?: Pick<LoadProfile, "quota">,
) => Math.min(CATALOGUE[kind].maxInstances, load?.quota?.[kind] ?? Infinity)

/** CPU time an ordinary API request takes on an {app-server}, in seconds. */
export const APP_REQUEST_SECONDS = 0.002
/** Cores on one {worker}; jobs that mostly wait can run this many times more at once. */
export const WORKER_CORES = 4
export const WAITING_JOBS_PER_CORE = 25
/** A job no level describes: a few tens of milliseconds of work. */
export const DEFAULT_JOB: NonNullable<LoadProfile["job"]> = {
  seconds: 0.08,
  cpuBound: true,
}

/** How many jobs a second one {worker} gets through for this level's job. */
export function workerJobsPerSecond(
  load: Pick<LoadProfile, "job">,
  cores = WORKER_CORES,
): number {
  const job = load.job ?? DEFAULT_JOB
  const slots = job.cpuBound ? cores : cores * WAITING_JOBS_PER_CORE
  return slots / job.seconds
}

/** Cores on one {app-server}, for when it takes jobs from a queue. */
export const APP_CORES = 2
/** Executions one block of {serverless} concurrency runs at once. */
export const SERVERLESS_CONCURRENCY = 1_000

/**
 * A request tier taking the level's jobs from a queue does the job, not an
 * API call: an {app-server} gets through as many as its cores allow, and a
 * block of {serverless} as many as its concurrency does.
 */
export function consumerJobsPerSecond(
  kind: ComponentKind,
  load: Pick<LoadProfile, "job">,
): number {
  const job = load.job ?? DEFAULT_JOB
  if (kind === "serverless") return SERVERLESS_CONCURRENCY / job.seconds
  return workerJobsPerSecond(load, APP_CORES)
}

/** A heavy job done inline costs this many ordinary requests of {app-server} capacity. */
export function inlineJobCost(load: LoadProfile): number {
  const job = load.job ?? DEFAULT_JOB
  return job.cpuBound ? job.seconds / APP_REQUEST_SECONDS : 1
}

/** And this much on the p99 of whoever does it while the user waits. */
export const inlineJobMs = (load: LoadProfile) =>
  (load.job ?? DEFAULT_JOB).seconds * 1000

/** The most one key in a {nosql} store can take, however many blocks it has. */
export const NOSQL_KEY_LIMIT = { readRps: 3_000, writeRps: 1_000 }

/** Average traffic over a month, as a share of the peak a level describes. */
export const AVERAGE_OF_PEAK = 0.3
const SECONDS_PER_MONTH = 2_628_000

/** A month of usage billing for this many reads and writes a second at peak. */
export function monthlyUsageUsd(
  spec: ComponentSpec,
  readRps: number,
  writeRps: number,
  averageOfPeak = AVERAGE_OF_PEAK,
  /** A model's tokens per call, when it's billed per token. */
  tokens?: LoadProfile["tokens"],
): number {
  const month = (rps: number) => (rps * averageOfPeak * SECONDS_PER_MONTH) / 1e6
  const t = spec.costPerMillionTokens
  if (t && tokens)
    return (
      month(readRps + writeRps) *
      (tokens.input * t.input + tokens.output * t.output)
    )
  const p = spec.costPerMillion
  if (!p) return 0
  return month(readRps) * p.reads + month(writeRps) * p.writes
}

/** Calls a second one block of a model's quota takes, at the level's tokens per call. */
export function callsPerSecond(
  spec: ComponentSpec,
  tokens?: LoadProfile["tokens"],
): number | undefined {
  if (!spec.tokensPerSecond || !tokens) return undefined
  return spec.tokensPerSecond / (tokens.input + tokens.output)
}

/** Above this utilisation latency starts to climb noticeably. */
export const SATURATION_WARN = 0.8
export const LATENCY_INFLATION_CAP = 20
