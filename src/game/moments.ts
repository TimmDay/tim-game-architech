import type { Level } from "~/levels"
import type { Provider } from "~/providers/names"
import type { Grade } from "~/sim/grade"
import { simulate } from "~/sim/simulate"
import type { Graph } from "~/sim/types"
import { mark } from "./achievements"
import type { ReviewState } from "./review"

/** A Sandbox design this big earns Mad scientist. */
export const MAD_SCIENTIST_PARTS = 20

/** The marker for having run a level at all: what First try looks back on. */
export const ranKey = (levelId: string) => `ran:${levelId}`
/** The marker for having opened a level's hint: what Unassisted looks back on. */
export const hintKey = (levelId: string) => `hint:${levelId}`

/** What the level's suggested solution costs a month. */
const parCost = (level: Level) =>
  simulate(level.reference, level.load).monthlyCostUsd

/**
 * Moments the achievements watch for, which saved stars can't tell: marked
 * as a graded run finishes, from the state before it.
 */
export function gradedMoments(
  s: ReviewState,
  {
    level,
    grade,
    provider,
    now,
    hadStars,
  }: {
    level: Level
    grade: Grade
    provider: Provider
    now: Date
    /** The level had a star before this run. */
    hadStars: boolean
  },
): ReviewState {
  const firstRun = !s.awarded[ranKey(level.id)] && !hadStars
  let next = mark(s, ranKey(level.id))
  if (grade.stars === 0) return next
  next = mark(next, `provider:${provider}`)
  if (now.getHours() < 5) next = mark(next, "event:night-owl")
  if (grade.stars < 3) return next
  const cost = grade.peak.monthlyCostUsd
  if (cost <= level.targets.budgetUsd * 0.75)
    next = mark(next, "event:penny-pincher")
  // A dollar's slack, so a rebuild of the solution itself doesn't count.
  if (cost < parCost(level) - 1) next = mark(next, "event:under-par")
  if (firstRun) next = mark(next, "event:first-try")
  if (level.track === "classic" && !s.awarded[hintKey(level.id)])
    next = mark(next, "event:unassisted")
  return next
}

/** Moments from a Sandbox run, which has no grade. */
export const sandboxMoments = (s: ReviewState, graph: Graph): ReviewState =>
  graph.components.length >= MAD_SCIENTIST_PARTS
    ? mark(s, "event:mad-scientist")
    : s
