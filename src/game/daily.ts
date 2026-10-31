import { LEVELS, type Level } from "~/levels"
import { grade, type Grade } from "~/sim/grade"
import { CATALOGUE } from "~/sim/catalogue"
import { simulate } from "~/sim/simulate"
import type { Fault } from "~/sim/types"
import { usd, ms } from "~/ui/format"
import { awardValue, type ReviewState } from "./review"

/**
 * The daily puzzle: one build level a day, the same for everyone, with one
 * rule changed. Every twist is checked against the level's suggested
 * solution, so the day's puzzle can always earn three stars.
 */

const pad = (n: number) => String(n).padStart(2, "0")
/** The player's own calendar day, as the streak counts it. */
export const dailyDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Puzzle #1's day. */
const FIRST = Date.UTC(2026, 9, 29)
const DAY = 86_400_000
/** Which puzzle a date is, counting from #1. Whole days, so DST can't skew it. */
export function dailyNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number)
  return Math.round((Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1) - FIRST) / DAY) + 1
}

export type Twist = {
  id: "budget" | "traffic" | "latency" | "chaos" | "none"
  /** One line for the card and the share text. */
  label: string
  apply: (l: Level) => Level
}

const roundUp = (n: number, step: number) => Math.ceil(n / step) * step
const EXTRA_CHAOS: { fault: Fault; label: string }[] = [
  { fault: { kind: "zone-outage" }, label: "Zone A loses power" },
  { fault: { kind: "traffic-spike", multiplier: 2 }, label: "traffic doubles" },
]

/** Growth: this much more traffic, and as much more budget to meet it. */
const GROWTH = 1.3

/** The suggested solution with every part grown to match, as far as it can go. */
const grown = (l: Level): Level["reference"] => ({
  ...l.reference,
  components: l.reference.components.map((c) => ({
    ...c,
    instances: Math.min(
      CATALOGUE[c.kind].maxInstances,
      Math.ceil(c.instances * GROWTH),
    ),
  })),
})

/**
 * The twists worth trying on a level, before checking any can be won. The
 * suggested solutions are sized close to their targets, so a twist tightens
 * a target to what the solution reaches, or grows the load and the means
 * together; a twist that loosens nothing and can't be won is dropped.
 */
export function candidateTwists(level: Level): Twist[] {
  const peak = simulate(level.reference, level.load)
  const t = level.targets
  const out: Twist[] = []
  // Three percent over what the suggested solution costs: no room for spare parts.
  const budget = roundUp(peak.monthlyCostUsd * 1.03, 100)
  if (budget < t.budgetUsd * 0.97)
    out.push({
      id: "budget",
      label: `Budget cut from ${usd(t.budgetUsd)} to ${usd(budget)} a month`,
      apply: (l) => ({ ...l, targets: { ...l.targets, budgetUsd: budget } }),
    })
  const more = Math.round((GROWTH - 1) * 100)
  out.push({
    id: "traffic",
    label: `${more}% more traffic at peak, and ${more}% more budget`,
    apply: (l) => ({
      ...l,
      load: { ...l.load, peakRps: l.load.peakRps * GROWTH },
      targets: {
        ...l.targets,
        budgetUsd: roundUp(l.targets.budgetUsd * GROWTH, 100),
      },
      reference: grown(l),
    }),
  })
  const p99 = roundUp(peak.p99Ms * 1.15, 10)
  if (p99 <= t.p99Ms * 0.85)
    out.push({
      id: "latency",
      label: `p99 target cut from ${ms(t.p99Ms)} to ${ms(p99)}`,
      apply: (l) => ({ ...l, targets: { ...l.targets, p99Ms: p99 } }),
    })
  for (const extra of EXTRA_CHAOS.filter(
    (x) => !level.chaos.faults.some((f) => f.kind === x.fault.kind),
  ))
    out.push({
      id: "chaos",
      label: `Extra chaos: ${extra.label} as well`,
      apply: (l) => ({
        ...l,
        chaos: {
          faults: [...l.chaos.faults, extra.fault],
          label: `${l.chaos.label}, and ${extra.label}`,
        },
      }),
    })
  return out
}

const gradeOf = (l: Level): Grade =>
  grade(l.reference, l.load, l.targets, l.chaos.faults)

/** The twists the suggested solution still earns three stars under. */
export const winnableTwists = (level: Level): Twist[] =>
  candidateTwists(level).filter((t) => gradeOf(t.apply(level)).stars === 3)

const NONE: Twist = { id: "none", label: "No twist today", apply: (l) => l }

/** Levels the daily draws from: every build level, whatever is unlocked. */
const POOL = LEVELS.filter((l) => l.mode === "build")
/** A step through the pool that visits every level before repeating one. */
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const STRIDE = [11, 13, 17, 19].find((s) => gcd(s, POOL.length) === 1) ?? 1

export type Daily = {
  date: string
  number: number
  base: Level
  twist: Twist
  /** The day's level, twisted, under its own id so its build is its own. */
  level: Level
  /** What the suggested solution costs under the twist. */
  par: number
}

/** Each day's puzzle is worked out once: it grades the solution several times. */
const made = new Map<string, Daily>()
export function dailyFor(date: string): Daily {
  const known = made.get(date)
  if (known) return known
  const d = makeDaily(date)
  made.set(date, d)
  return d
}

function makeDaily(date: string): Daily {
  const number = dailyNumber(date)
  const i =
    ((((number - 1) * STRIDE) % POOL.length) + POOL.length) % POOL.length
  const base = POOL[i] as Level
  const twists = winnableTwists(base)
  const twist = twists.length ? (twists[number % twists.length] as Twist) : NONE
  const twisted = twist.apply(base)
  const level: Level = {
    ...twisted,
    id: `daily-${date}`,
    requires: [],
    title: `Daily, ${dayLabel(date)}: ${base.title}`,
    daily: { date, number, baseId: base.id, twist: twist.label },
  }
  const par = simulate(level.reference, level.load).monthlyCostUsd
  return { date, number, base, twist, level, par }
}

// --- results, as markers in the review state ---------------------------------

/** "31 Oct": what the daily is called, since a puzzle number says nothing. */
export const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })

/** A day's best: "daily:<date>:<stars>:<cost>". Zero points; merges as a set. */
const PREFIX = "daily:"
export type DailyBest = { stars: number; cost: number }

export function dailyBest(s: ReviewState, date: string): DailyBest | null {
  let best: DailyBest | null = null
  for (const k of Object.keys(s.awarded)) {
    if (!k.startsWith(`${PREFIX}${date}:`)) continue
    const [, , stars, cost] = k.split(":")
    const b = { stars: Number(stars), cost: Number(cost) }
    if (!best || better(b, best)) best = b
  }
  return best
}

/** More stars wins; at the same stars, cheaper wins. */
const better = (a: DailyBest, b: DailyBest) =>
  a.stars > b.stars || (a.stars === b.stars && a.cost < b.cost)

/** A cost has to fall this far to make a new record. */
export const COST_STEP = 0.03
const worthKeeping = (run: DailyBest, best: DailyBest) =>
  run.stars > best.stars ||
  (run.stars === best.stars && run.cost <= best.cost * (1 - COST_STEP))

/** Three stars on the day's puzzle, once a day: worth points (see review.ts). */
export const dailyWinKey = (date: string) => `dailywin:${date}`

/** Keep a run's result if it beats the day's best. */
export function recordDaily(
  s: ReviewState,
  date: string,
  g: Grade,
): ReviewState {
  const run = { stars: g.stars, cost: Math.round(g.peak.monthlyCostUsd) }
  const best = dailyBest(s, date)
  // Each record is a key that can never be removed (awards merge as a set),
  // so a cheaper run only counts once it's a real step cheaper.
  if (best && !worthKeeping(run, best)) return s
  const awarded = {
    ...s.awarded,
    [`${PREFIX}${date}:${run.stars}:${run.cost}`]: true as const,
  }
  const win = run.stars === 3 && !s.awarded[dailyWinKey(date)]
  if (win) awarded[dailyWinKey(date)] = true
  return {
    ...s,
    awarded,
    total: s.total + (win ? awardValue(dailyWinKey(date)) : 0),
  }
}

/** Days with three stars on the daily. */
export const dailyWins = (s: ReviewState) =>
  Object.keys(s.awarded).filter((k) => k.startsWith("dailywin:")).length

/** What a player pastes into the team chat. No product names: it's game text. */
export function shareText(d: Daily, best: DailyBest, url: string): string {
  const stars = "★".repeat(best.stars) + "☆".repeat(3 - best.stars)
  const vsPar =
    best.stars === 3
      ? best.cost < d.par - 1
        ? `, under par (${usd(d.par)})`
        : `, par ${usd(d.par)}`
      : ""
  return [
    `Architech daily, ${dayLabel(d.date)}: ${d.base.title}`,
    d.twist.label,
    `${stars} ${usd(best.cost)}/mo${vsPar}`,
    url,
  ].join("\n")
}
