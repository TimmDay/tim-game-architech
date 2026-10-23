import type { ComponentKind, ComponentSpec } from "./types"

/**
 * The numbers every grade rests on. Capacities are per instance and deliberately
 * round: this is a game curve, not a benchmark, and the lessons only need the
 * ratios to be right (a replica absorbs reads, not writes; a cache is two orders
 * of magnitude faster than the database behind it; a worker is slow but off the
 * critical path).
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
    capacity: { readRps: 100_000, writeRps: 100_000 },
    baseLatency: { p50Ms: 8, p99Ms: 35 },
    baselineAvailability: 0.9999,
    managed: true,
    optionalOnPath: true,
    routesTraffic: true,
    caches: true,
    costPerInstanceMonthUsd: 25,
    maxInstances: 1,
  },
  "load-balancer": {
    ...base,
    kind: "load-balancer",
    category: "edge",
    capacity: { readRps: 20_000, writeRps: 20_000 },
    baseLatency: { p50Ms: 2, p99Ms: 8 },
    baselineAvailability: 0.9999,
    managed: true,
    routesTraffic: true,
    costPerInstanceMonthUsd: 20,
    maxInstances: 4,
  },
  "api-gateway": {
    ...base,
    kind: "api-gateway",
    category: "edge",
    capacity: { readRps: 10_000, writeRps: 10_000 },
    baseLatency: { p50Ms: 5, p99Ms: 20 },
    baselineAvailability: 0.9995,
    managed: true,
    routesTraffic: true,
    costPerInstanceMonthUsd: 35,
    maxInstances: 4,
  },
  "app-server": {
    ...base,
    kind: "app-server",
    category: "compute",
    capacity: { readRps: 400, writeRps: 400 },
    baseLatency: { p50Ms: 20, p99Ms: 80 },
    baselineAvailability: 0.99,
    costPerInstanceMonthUsd: 30,
  },
  serverless: {
    ...base,
    kind: "serverless",
    category: "compute",
    // One "instance" is a block of concurrency. Cold starts are the p99 tax.
    capacity: { readRps: 1_000, writeRps: 1_000 },
    baseLatency: { p50Ms: 25, p99Ms: 400 },
    baselineAvailability: 0.9995,
    managed: true,
    costPerInstanceMonthUsd: 60,
    maxInstances: 10,
  },
  cache: {
    ...base,
    kind: "cache",
    category: "data",
    capacity: { readRps: 50_000, writeRps: 50_000 },
    baseLatency: { p50Ms: 1, p99Ms: 3 },
    baselineAvailability: 0.995,
    optionalOnPath: true,
    caches: true,
    costPerInstanceMonthUsd: 25,
    maxInstances: 6,
  },
  "sql-primary": {
    ...base,
    kind: "sql-primary",
    category: "data",
    capacity: { readRps: 2_000, writeRps: 500 },
    baseLatency: { p50Ms: 5, p99Ms: 30 },
    baselineAvailability: 0.995,
    // Extra instances are standbys: another failure domain, no extra capacity.
    scalesOut: false,
    costPerInstanceMonthUsd: 120,
    maxInstances: 3,
  },
  "sql-replica": {
    ...base,
    kind: "sql-replica",
    category: "data",
    capacity: { readRps: 2_000, writeRps: 0 },
    baseLatency: { p50Ms: 5, p99Ms: 30 },
    baselineAvailability: 0.995,
    optionalOnPath: true,
    readOnly: true,
    costPerInstanceMonthUsd: 120,
    maxInstances: 5,
  },
  nosql: {
    ...base,
    kind: "nosql",
    category: "data",
    capacity: { readRps: 5_000, writeRps: 2_500 },
    baseLatency: { p50Ms: 4, p99Ms: 15 },
    baselineAvailability: 0.9999,
    managed: true,
    costPerInstanceMonthUsd: 70,
    maxInstances: 10,
  },
  queue: {
    ...base,
    kind: "queue",
    category: "messaging",
    capacity: { readRps: 10_000, writeRps: 10_000 },
    baseLatency: { p50Ms: 5, p99Ms: 20 },
    baselineAvailability: 0.9999,
    managed: true,
    // Competing consumers: each message goes to ONE of them.
    routesTraffic: true,
    async: true,
    costPerInstanceMonthUsd: 10,
    maxInstances: 1,
  },
  "event-stream": {
    ...base,
    kind: "event-stream",
    category: "messaging",
    capacity: { readRps: 20_000, writeRps: 20_000 },
    baseLatency: { p50Ms: 5, p99Ms: 25 },
    baselineAvailability: 0.9995,
    managed: true,
    // Every consumer group sees every event.
    async: true,
    broadcasts: true,
    costPerInstanceMonthUsd: 60,
    maxInstances: 4,
  },
  worker: {
    ...base,
    kind: "worker",
    category: "compute",
    capacity: { readRps: 50, writeRps: 50 },
    baseLatency: { p50Ms: 400, p99Ms: 1_800 },
    baselineAvailability: 0.99,
    costPerInstanceMonthUsd: 40,
  },
  "object-store": {
    ...base,
    kind: "object-store",
    category: "data",
    capacity: { readRps: 5_000, writeRps: 3_000 },
    baseLatency: { p50Ms: 20, p99Ms: 80 },
    baselineAvailability: 0.9999,
    managed: true,
    costPerInstanceMonthUsd: 15,
    maxInstances: 1,
  },
  "search-index": {
    ...base,
    kind: "search-index",
    category: "data",
    capacity: { readRps: 3_000, writeRps: 1_000 },
    baseLatency: { p50Ms: 15, p99Ms: 60 },
    baselineAvailability: 0.999,
    optionalOnPath: true,
    costPerInstanceMonthUsd: 90,
    maxInstances: 6,
  },
  "data-warehouse": {
    ...base,
    kind: "data-warehouse",
    category: "data",
    capacity: { readRps: 50, writeRps: 5_000 },
    baseLatency: { p50Ms: 800, p99Ms: 4_000 },
    baselineAvailability: 0.999,
    managed: true,
    optionalOnPath: true,
    costPerInstanceMonthUsd: 200,
    maxInstances: 1,
  },
  "doc-ai": {
    ...base,
    kind: "doc-ai",
    category: "compute",
    // A managed OCR / document-extraction API. One "instance" is a block of
    // throughput quota you've had raised, not a server: providers cap calls
    // per second by default. Really it's billed per page; a flat monthly
    // price per block is the game's simplification.
    capacity: { readRps: 40, writeRps: 40 },
    baseLatency: { p50Ms: 1_500, p99Ms: 4_000 },
    baselineAvailability: 0.999,
    managed: true,
    costPerInstanceMonthUsd: 120,
    maxInstances: 10,
  },
  "third-party-api": {
    ...base,
    kind: "third-party-api",
    category: "compute",
    // Someone else's service: a payment provider, a carrier's rates API. One
    // "instance" is a block of the call quota your contract allows.
    capacity: { readRps: 300, writeRps: 300 },
    baseLatency: { p50Ms: 150, p99Ms: 600 },
    baselineAvailability: 0.999,
    managed: true,
    costPerInstanceMonthUsd: 50,
    maxInstances: 10,
  },
}

export const KINDS = Object.keys(CATALOGUE) as ComponentKind[]

/** Heavy jobs done inline cost this many ordinary writes of capacity each. */
export const HEAVY_JOB_COST = 20
/** And this much on the p99 of whoever does them while the user waits. */
export const HEAVY_JOB_P99_MS = 1_800
/** Above this utilisation latency starts to climb noticeably. */
export const SATURATION_WARN = 0.8
export const LATENCY_INFLATION_CAP = 20
