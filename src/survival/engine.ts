import { CATALOGUE } from "~/sim/catalogue"
import { monthlyCost, simulate } from "~/sim/simulate"
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
    blurb: "Half the writes are slow jobs that mustn't block users.",
    load: {
      readFraction: 0.5,
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

export type Wave = {
  n: number
  mix: Mix
  load: LoadProfile
  /** Monthly budget available while building for this wave. */
  budget: number
  /** Hidden until the wave runs: part of the fun is not knowing. */
  incidents: Incident[]
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

export const START_RPS = 300
export const GROWTH = 1.3
export const START_BUDGET = 500
export const BUDGET_GROWTH = 1.17
export const LIVES = 3

const round10 = (n: number) => Math.round(n / 10) * 10

export function wave(seed: number, n: number): Wave {
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
  return {
    n,
    mix,
    load: {
      peakRps: round10(START_RPS * Math.pow(GROWTH, n - 1)),
      ...MIX[mix].load,
    },
    budget: round10(START_BUDGET * Math.pow(BUDGET_GROWTH, n - 1)),
    incidents,
  }
}

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
  return { survived: reasons.length === 0, peak, hit, reasons }
}

export const canLaunch = (graph: Graph, w: Wave) =>
  monthlyCost(graph) <= w.budget

/** Every component, available from the start. */
export const SURVIVAL_PALETTE = Object.keys(CATALOGUE) as ComponentKind[]

/** Survival opens once these levels have a star: it assumes their ideas. */
export const SURVIVAL_REQUIRES = ["front-page", "upload-rush"]
