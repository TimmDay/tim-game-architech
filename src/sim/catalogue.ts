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
}

export const KINDS = Object.keys(CATALOGUE) as ComponentKind[]

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
export function workerJobsPerSecond(load: Pick<LoadProfile, "job">): number {
  const job = load.job ?? DEFAULT_JOB
  const slots = job.cpuBound
    ? WORKER_CORES
    : WORKER_CORES * WAITING_JOBS_PER_CORE
  return slots / job.seconds
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
): number {
  const p = spec.costPerMillion
  if (!p) return 0
  const month = (rps: number) => (rps * averageOfPeak * SECONDS_PER_MONTH) / 1e6
  return month(readRps) * p.reads + month(writeRps) * p.writes
}

/** Above this utilisation latency starts to climb noticeably. */
export const SATURATION_WARN = 0.8
export const LATENCY_INFLATION_CAP = 20
