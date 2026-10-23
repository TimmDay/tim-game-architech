import { LEVELS } from "~/levels"
import type { ReviewState } from "./review"
import type { Progress, QuizRecord } from "./storage"

/**
 * Achievements, each derived from state the game already persists, so they
 * can be granted retroactively and never need their own bookkeeping beyond
 * the one-time award key.
 */
export type AchievementContext = {
  progress: Progress
  review: ReviewState
  quizzes: Record<string, QuizRecord>
}

export type Achievement = {
  id: string
  title: string
  description: string
  /** lucide icon name, resolved in the UI. */
  icon:
    | "Star"
    | "Stars"
    | "Crown"
    | "PiggyBank"
    | "Search"
    | "Wrench"
    | "GraduationCap"
    | "Target"
    | "Layers"
    | "Swords"
    | "Shield"
    | "Brain"
    | "Globe"
  earned: (c: AchievementContext) => boolean
}

export const ACHIEVEMENT_POINTS = 20

const count = (s: ReviewState, prefix: string) =>
  Object.keys(s.awarded).filter((k) => k.startsWith(prefix)).length
const flag = (s: ReviewState, key: string) => s.awarded[key] === true
const stars = (c: AchievementContext, id: string) => c.progress[id]?.stars ?? 0
const build = LEVELS.filter((l) => l.mode === "build")
const repair = LEVELS.filter((l) => l.mode === "repair")

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-star",
    title: "It's alive",
    description: "Earn your first star on any level.",
    icon: "Star",
    earned: (c) => LEVELS.some((l) => stars(c, l.id) > 0),
  },
  {
    id: "load-bearing",
    title: "Load bearing",
    description: "Earn three stars on a level.",
    icon: "Stars",
    earned: (c) => LEVELS.some((l) => stars(c, l.id) === 3),
  },
  {
    id: "architect",
    title: "Architect",
    description: "Three stars on every build level.",
    icon: "Crown",
    earned: (c) => build.every((l) => stars(c, l.id) === 3),
  },
  {
    id: "penny-pincher",
    title: "Penny pincher",
    description: "Three stars while spending no more than 75% of the budget.",
    icon: "PiggyBank",
    earned: (c) => flag(c.review, "event:penny-pincher"),
  },
  {
    id: "sherlock",
    title: "Sherlock",
    description: "Name a repair level's root cause on the first try.",
    icon: "Search",
    earned: (c) => repair.some((l) => c.progress[l.id]?.diagnosedFirstTry),
  },
  {
    id: "on-call",
    title: "On call",
    description: "Earn a star on every repair level.",
    icon: "Wrench",
    earned: (c) => repair.every((l) => stars(c, l.id) > 0),
  },
  {
    id: "scholar",
    title: "Scholar",
    description: "Pass five scenario quizzes.",
    icon: "GraduationCap",
    earned: (c) => Object.values(c.quizzes).filter((q) => q.passed).length >= 5,
  },
  {
    id: "flawless",
    title: "Flawless",
    description: "Score 10 out of 10 on a quiz.",
    icon: "Target",
    earned: (c) => Object.values(c.quizzes).some((q) => q.best === 10),
  },
  {
    id: "deck-hand",
    title: "Deck hand",
    description: "Work through 100 discussion cards.",
    icon: "Layers",
    earned: (c) => count(c.review, "flash:") >= 100,
  },
  {
    id: "survivor",
    title: "Survivor",
    description: "Clear wave 5 in Survival.",
    icon: "Shield",
    earned: (c) => flag(c.review, "survival:5"),
  },
  {
    id: "unbreakable",
    title: "Unbreakable",
    description: "Clear wave 10 in Survival.",
    icon: "Swords",
    earned: (c) => flag(c.review, "survival:10"),
  },
  {
    id: "elephant",
    title: "Memory of an elephant",
    description: "Get 25 Retention reviews right.",
    icon: "Brain",
    earned: (c) => (c.review.reviewsRight ?? 0) >= 25,
  },
  {
    id: "polyglot",
    title: "Polyglot",
    description: "Pass levels with AWS, Azure, GCP and generic names.",
    icon: "Globe",
    earned: (c) =>
      ["aws", "azure", "gcp", "generic"].every((p) =>
        flag(c.review, `provider:${p}`),
      ),
  },
]

/** Award everything newly earned. Returns the state and what was new. */
export function grantAchievements(
  s: ReviewState,
  ctx: Omit<AchievementContext, "review">,
): { state: ReviewState; granted: Achievement[] } {
  const granted = ACHIEVEMENTS.filter(
    (a) => !s.awarded[`ach:${a.id}`] && a.earned({ ...ctx, review: s }),
  )
  if (granted.length === 0) return { state: s, granted }
  const awarded = { ...s.awarded }
  for (const a of granted) awarded[`ach:${a.id}`] = true
  return {
    state: {
      ...s,
      awarded,
      total: s.total + granted.length * ACHIEVEMENT_POINTS,
    },
    granted,
  }
}

/** A marker with no points: things achievements watch for. */
export const mark = (s: ReviewState, key: string): ReviewState =>
  s.awarded[key] ? s : { ...s, awarded: { ...s.awarded, [key]: true } }

export const RANKS = [
  { at: 0, title: "Intern" },
  { at: 50, title: "Junior Engineer" },
  { at: 150, title: "Engineer" },
  { at: 350, title: "Senior Engineer" },
  { at: 700, title: "Staff Engineer" },
  { at: 1200, title: "Principal Engineer" },
  { at: 2000, title: "Distinguished Architect" },
]

export function rank(points: number) {
  let i = 0
  while (i + 1 < RANKS.length && (RANKS[i + 1]?.at ?? Infinity) <= points) i++
  const current = RANKS[i] ?? { at: 0, title: "Intern" }
  const next = RANKS[i + 1]
  return {
    title: current.title,
    next,
    progress: next ? (points - current.at) / (next.at - current.at) : 1,
  }
}
