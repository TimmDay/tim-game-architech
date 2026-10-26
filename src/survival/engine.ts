import { CATALOGUE } from "~/sim/catalogue"
import { writesAt, type Targets, type WriteSink } from "~/sim/grade"
import { simulate } from "~/sim/simulate"
import type {
  ComponentKind,
  Fault,
  Graph,
  LoadProfile,
  SimResult,
} from "~/sim/types"

/**
 * Survival: endless waves of growing traffic and random disasters. Pure and
 * seeded, so a run is reproducible and the balance can be pinned by tests.
 */

export type Mix = "browsing" | "checkout" | "uploads"

export const MIX: Record<
  Mix,
  { label: string; blurb: string; load: Omit<LoadProfile, "peakRps"> }
> = {
  browsing: {
    label: "Browsing surge",
    blurb: "Mostly reads of the same popular pages.",
    load: {
      readFraction: 0.92,
      cacheableFraction: 0.75,
      heavyWriteFraction: 0,
    },
  },
  checkout: {
    label: "Checkout rush",
    blurb: "Lots of writes: every one has to be stored.",
    load: { readFraction: 0.6, cacheableFraction: 0.4, heavyWriteFraction: 0 },
  },
  uploads: {
    label: "Upload flood",
    blurb: "Most writes are uploads: slow jobs that mustn't block users.",
    load: {
      readFraction: 0.9,
      cacheableFraction: 0.3,
      heavyWriteFraction: 0.6,
    },
  },
}

export type Incident = { faults: Fault[]; label: string }

/** Disasters the engine can actually stage. Each targets a real weakness. */
const INCIDENTS: Incident[] = [
  {
    faults: [{ kind: "kill-instance", target: "app-server" }],
    label: "An app server crashes",
  },
  { faults: [{ kind: "zone-outage" }], label: "Zone A loses power" },
  {
    faults: [{ kind: "traffic-spike", multiplier: 1.5 }],
    label: "You're trending (1.5x traffic)",
  },
  {
    faults: [{ kind: "kill-instance", target: "cache" }],
    label: "A cache node restarts cold",
  },
  {
    faults: [{ kind: "kill-instance", target: "sql-primary" }],
    label: "The database primary fails",
  },
  {
    faults: [{ kind: "kill-instance", target: "worker" }],
    label: "A worker dies mid-job",
  },
]

/**
 * Something the business starts asking for partway through a run. Unlike an
 * incident it's announced, and it stays for the rest of the run: once finance
 * has a warehouse, they keep wanting it fed. Each one needs a component that
 * more app servers can't stand in for.
 */
export type DemandId = "fulfilment" | "search" | "analytics" | "ledger"

export type Demand = {
  id: DemandId
  label: string
  /** What's asked, in `{kind}` tokens. */
  blurb: string
  /** The level that teaches what it needs: no demand before its idea is met. */
  teaches: string
  /** The earliest wave it can arrive on. */
  from: number
  /** Stores every write must reach. */
  sinks: WriteSink[]
  /** Monthly budget it adds: a fixed part and a part per request a second. */
  budget: { base: number; perRps: number }
}

export const DEMANDS: Record<DemandId, Demand> = {
  fulfilment: {
    id: "fulfilment",
    label: "Courier bookings",
    blurb:
      "A quarter of all writes are now orders that book a courier, and the courier's API takes a second to answer. Customers only need to see that the order was placed: the booking can happen a moment later.",
    teaches: "upload-rush",
    from: 3,
    sinks: [],
    budget: { base: 300, perRps: 0.2 },
  },
  search: {
    id: "search",
    label: "Search launch",
    blurb:
      "Product wants search. Every write must also reach a {search-index}, kept up to date by events rather than on the request path.",
    teaches: "feed-the-analysts",
    from: 3,
    sinks: ["search-index"],
    budget: { base: 450, perRps: 0.05 },
  },
  analytics: {
    id: "analytics",
    label: "Analytics drive",
    blurb:
      "Finance wants every order in a {data-warehouse} for their reports. It's built for big queries, not for sitting on the request path.",
    teaches: "feed-the-analysts",
    from: 4,
    sinks: ["data-warehouse"],
    budget: { base: 1_150, perRps: 0.02 },
  },
  ledger: {
    id: "ledger",
    label: "Audited ledger",
    blurb:
      "The auditors want every write in a {sql-primary}, with transactions. When one primary can't take the writes, split it into shards by customer.",
    teaches: "tenant-split",
    from: 6,
    sinks: ["sql-primary"],
    budget: { base: 0, perRps: 0.05 },
  },
}

/** A 1-second call that mostly waits: workers run many at once. */
const COURIER_JOB = { seconds: 1, cpuBound: false }

/** How the ledger can be split: by customer spreads it, by time doesn't. */
const LEDGER_KEYS: NonNullable<LoadProfile["partitionKeys"]> = [
  { id: "customer", label: "Customer ID", hotShare: 0.02, scatterReads: 0 },
  { id: "time", label: "Time of the write", hotShare: 1, scatterReads: 0 },
]

/** The chance a new demand arrives on a wave that could take one. */
const DEMAND_CHANCE = 0.35

export type Wave = {
  n: number
  mix: Mix
  load: LoadProfile
  /** Monthly budget available while building for this wave. */
  budget: number
  /** Hidden until the wave runs: part of the fun is not knowing. */
  incidents: Incident[]
  /** What the business asks for this wave, oldest first. */
  demands: Demand[]
  /** The demand that arrived on this wave, if any. */
  fresh?: DemandId
}

/** Mulberry32: small, fast, and good enough for a game. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const START_RPS = 1_000
export const GROWTH = 1.3
/** What a minimal resilient stack costs before any traffic. */
export const BUDGET_BASE = 1_100
/**
 * What each request a second adds to the month, for the costliest mix: a
 * checkout rush past one database's writes, or an upload flood's workers,
 * messages and stored files. Browsing waves leave room to spare.
 */
export const BUDGET_PER_RPS = 0.85
/** Room to spare over a sensible design, so there's more than one answer. */
export const BUDGET_MARGIN = 1.2
export const LIVES = 3

const round10 = (n: number) => Math.round(n / 10) * 10

/**
 * Demands in force on wave `n`, oldest first. Drawn from a stream of their
 * own, so they never change a seed's traffic or incidents. `known`: levels
 * with a star, since each demand waits for the level that teaches it.
 */
function demandsBy(
  seed: number,
  n: number,
  known: ReadonlySet<string>,
): Demand[] {
  const out: Demand[] = []
  for (let k = 3; k <= n; k++) {
    const r = rng(seed * 6007 + k * 15485863)
    if (r() >= DEMAND_CHANCE) continue
    const open = Object.values(DEMANDS).filter(
      (d) => d.from <= k && known.has(d.teaches) && !out.includes(d),
    )
    const pick = open[Math.floor(r() * open.length)]
    if (pick) out.push(pick)
  }
  return out
}

/** Every level: for tests and tools that want every demand on offer. */
export const KNOWS_ALL: ReadonlySet<string> = new Set(
  Object.values(DEMANDS).map((d) => d.teaches),
)

export function wave(
  seed: number,
  n: number,
  known: ReadonlySet<string> = KNOWS_ALL,
): Wave {
  const r = rng(seed * 7919 + n * 104729)
  // Wave 1 is always gentle browsing. Upload floods need a queue and workers,
  // which the early budget can't stretch to, so they start at wave 4.
  const mixes: Mix[] =
    n === 1
      ? ["browsing"]
      : n < 4
        ? ["browsing", "checkout"]
        : ["browsing", "checkout", "uploads"]
  const mix = mixes[Math.floor(r() * mixes.length)] ?? "browsing"
  const count = n < 3 ? 0 : n < 7 ? 1 : 2
  const pool = [...INCIDENTS]
  const incidents: Incident[] = []
  for (let i = 0; i < count && pool.length; i++) {
    const pick = pool.splice(Math.floor(r() * pool.length), 1)[0]
    if (pick) incidents.push(pick)
  }
  const peakRps = round10(START_RPS * Math.pow(GROWTH, n - 1))
  const demands = demandsBy(seed, n, known)
  const has = (id: DemandId) => demands.some((d) => d.id === id)
  const load: LoadProfile = { peakRps, ...MIX[mix].load }
  // The courier call is the slow job from now on. In an upload flood it waits
  // alongside the resizing, so the flood's share of slow writes stays.
  if (has("fulfilment")) {
    load.heavyWriteFraction = Math.max(load.heavyWriteFraction, 0.25)
    load.job = COURIER_JOB
  }
  if (has("ledger")) load.partitionKeys = LEDGER_KEYS
  const extra = demands.reduce(
    (t, d) => t + d.budget.base + d.budget.perRps * peakRps,
    0,
  )
  const fresh = demands.at(-1)
  return {
    n,
    mix,
    load,
    budget: round10(
      BUDGET_MARGIN * (BUDGET_BASE + BUDGET_PER_RPS * peakRps + extra),
    ),
    incidents,
    demands,
    fresh:
      fresh && demandsBy(seed, n - 1, known).length < demands.length
        ? fresh.id
        : undefined,
  }
}

/** The wave as a level's targets, so findings can explain a missed demand. */
export const waveTargets = (w: Wave): Targets => ({
  p99Ms: WAVE_P99_LIMIT_MS,
  maxErrorRate: WAVE_ERROR_LIMIT,
  availability: 0,
  budgetUsd: w.budget,
  writesReach: w.demands.flatMap((d) => d.sinks),
  noBacklog: true,
})

export const WAVE_P99_LIMIT_MS = 800
export const WAVE_ERROR_LIMIT = 0.01

export type WaveOutcome = {
  survived: boolean
  peak: SimResult
  hit: SimResult
  reasons: string[]
}

/** Run a wave: peak traffic, then the same traffic with its incidents. */
export function playWave(graph: Graph, w: Wave): WaveOutcome {
  const faults = w.incidents.flatMap((i) => i.faults)
  const peak = simulate(graph, w.load)
  const hit = simulate(graph, w.load, faults)
  const reasons: string[] = []
  if (!peak.connected) reasons.push("Nothing is connected to your users.")
  if (peak.errorRate > WAVE_ERROR_LIMIT)
    reasons.push(
      `${Math.round(peak.errorRate * 100)}% of requests failed at peak.`,
    )
  if (peak.p99Ms > WAVE_P99_LIMIT_MS)
    reasons.push(`p99 hit ${Math.round(peak.p99Ms)}ms; users gave up.`)
  if (faults.length && hit.errorRate > WAVE_ERROR_LIMIT)
    reasons.push(
      `${Math.round(hit.errorRate * 100)}% failed during the incident.`,
    )
  if (Math.max(peak.backlogGrowthRps, hit.backlogGrowthRps) > 0.5)
    reasons.push("Background jobs fell behind and the queue never drained.")
  const writes = w.load.peakRps * (1 - w.load.readFraction)
  for (const d of w.demands)
    for (const sink of d.sinks) {
      const got = writesAt(graph, peak, sink, w.load.job?.emits)
      if (peak.connected && got < writes * 0.99)
        reasons.push(
          `${d.label}: only ${Math.round((got / writes) * 100)}% of writes reached the {${sink}}.`,
        )
    }
  return { survived: reasons.length === 0, peak, hit, reasons }
}

/** What the design costs a month at this wave's traffic. */
export const waveCost = (graph: Graph, w: Wave) =>
  simulate(graph, w.load).monthlyCostUsd

export const canLaunch = (graph: Graph, w: Wave) =>
  waveCost(graph, w) <= w.budget

/** Every component you run yourself, available from the start. */
export const SURVIVAL_PALETTE = (
  Object.keys(CATALOGUE) as ComponentKind[]
).filter((k) => k !== "third-party-api")

/** Survival opens once these levels have a star: it assumes their ideas. */
export const SURVIVAL_REQUIRES = ["front-page", "upload-rush"]
