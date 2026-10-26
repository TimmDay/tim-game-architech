import { DECKS } from "~/decks"
import { LEVELS } from "~/levels"
import { QUIZZES } from "~/quiz/questions"
import { ESTIMATES } from "~/quiz/estimate"
import { SCHEMA } from "~/quiz/schema"
import { awardValue, type ReviewState } from "./review"
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
    | "Sparkles"
    | "Telescope"
    | "Siren"
    | "Database"
    | "Moon"
    | "Plane"
    | "Calculator"
  earned: (c: AchievementContext) => boolean
}

export { ACHIEVEMENT_POINTS } from "./achievement-points"
import { ACHIEVEMENT_POINTS } from "./achievement-points"

const count = (s: ReviewState, prefix: string) =>
  Object.keys(s.awarded).filter((k) => k.startsWith(prefix)).length
const flag = (s: ReviewState, key: string) => s.awarded[key] === true
const stars = (c: AchievementContext, id: string) => c.progress[id]?.stars ?? 0
/** Stars earned across every level: the other tally, next to points. */
export const starCount = (progress: Progress) =>
  LEVELS.reduce((n, l) => n + (progress[l.id]?.stars ?? 0), 0)
export const MAX_STARS = LEVELS.length * 3
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
  {
    id: "star-collector",
    title: "Star collector",
    description: "Earn 25 stars.",
    icon: "Sparkles",
    earned: (c) => starCount(c.progress) >= 25,
  },
  {
    id: "constellation",
    title: "Constellation",
    description: "Earn half of all the stars there are.",
    icon: "Telescope",
    earned: (c) => starCount(c.progress) * 2 >= MAX_STARS,
  },
  {
    id: "postmortem",
    title: "Blameless postmortem",
    description: "Three stars on every repair level.",
    icon: "Siren",
    earned: (c) => repair.every((l) => stars(c, l.id) === 3),
  },
  {
    id: "schema-nerd",
    title: "Schema nerd",
    description: "Answer 50 schema and API questions right.",
    icon: "Database",
    earned: (c) => count(c.review, "schema:") >= 50,
  },
  {
    id: "envelope",
    title: "Back of the envelope",
    description: "Finish 25 estimation cards.",
    icon: "Calculator",
    earned: (c) => count(c.review, "est:") >= 25,
  },
  {
    id: "jet-lag",
    title: "Jet lag",
    description: "Three stars on Worldwide.",
    icon: "Plane",
    earned: (c) => stars(c, "worldwide") === 3,
  },
  {
    id: "night-owl",
    title: "Night owl",
    description:
      "Earn a star between midnight and 5am. Production never sleeps.",
    icon: "Moon",
    earned: (c) => flag(c.review, "event:night-owl"),
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

/** One-time awards from content that has an end: not Retention or Survival. */
const FINITE = ["flash:", "mc:", "schema:", "est:", "pass:", "star:", "ach:"]
const MAX_AWARDS =
  new Set(Object.values(DECKS).flatMap((d) => d.map((c) => c.id))).size *
    awardValue("flash:") +
  Object.values(QUIZZES).flat().length * awardValue("mc:") +
  Object.values(SCHEMA).flat().length * awardValue("schema:") +
  Object.values(ESTIMATES).flat().length * awardValue("est:") +
  LEVELS.length * (awardValue("pass:") + 3 * awardValue("star:")) +
  ACHIEVEMENTS.length * ACHIEVEMENT_POINTS

/**
 * How much of the game is done: the lower of the share of stars and the
 * share of one-time points. Retention and Survival keep paying forever, so
 * they count toward points but not here: farming them can't fake it.
 */
export function completion(review: ReviewState, progress: Progress) {
  const awards = Object.keys(review.awarded)
    .filter((k) => FINITE.some((p) => k.startsWith(p)))
    .reduce((t, k) => t + awardValue(k), 0)
  const stars = starCount(progress) / MAX_STARS
  const points = Math.min(1, awards / MAX_AWARDS)
  return { stars, points, value: Math.min(stars, points) }
}

export type Rank = {
  title: string
  /** Every requirement must be met. */
  points?: number
  stars?: number
  /** Share of the whole game, from `completion`. */
  done?: number
}

/** Early ranks need points and stars; the top ones need most of the game. */
export const RANKS: Rank[] = [
  { title: "Game Modder" },
  { title: "The Spreadsheet Guy", points: 25 },
  { title: "Student", points: 75, stars: 2 },
  { title: "Intern", points: 150, stars: 5 },
  { title: "Junior Engineer", points: 300, stars: 12 },
  { title: "Engineer", points: 550, stars: 24 },
  { title: "Senior Engineer", points: 900, stars: 40 },
  { title: "Staff Engineer", points: 1300, stars: 56 },
  { title: "Principal Engineer", points: 1800, stars: 72 },
  { title: "Distinguished Architect", points: 2400, stars: 88 },
  { title: "Chaos Monkey Tamer", done: 0.7 },
  { title: "Keeper of the Five Nines", done: 0.8 },
  { title: "Linus Torvalds", done: 0.9 },
  { title: "Claude Shannon", done: 0.98 },
]

type Standing = { points: number; stars: number; done: number }

/** How far toward a rank, 0 to 1: the furthest-behind requirement decides. */
const toward = (r: Rank, s: Standing) =>
  Math.min(
    1,
    r.points ? s.points / r.points : 1,
    r.stars ? s.stars / r.stars : 1,
    r.done ? s.done / r.done : 1,
  )

export function rank(review: ReviewState, progress: Progress) {
  const s: Standing = {
    points: review.total,
    stars: starCount(progress),
    done: completion(review, progress).value,
  }
  let i = 0
  while (i + 1 < RANKS.length && toward(RANKS[i + 1] as Rank, s) >= 1) i++
  const next = RANKS[i + 1]
  return {
    title: RANKS[i]?.title ?? "Game Modder",
    next,
    progress: next ? toward(next, s) : 1,
    /** What's still missing for the next rank, in words. */
    needs: next
      ? [
          next.points && s.points < next.points
            ? `${(next.points - s.points).toLocaleString("en-US")} more points`
            : null,
          next.stars && s.stars < next.stars
            ? `${next.stars - s.stars} more ${next.stars - s.stars === 1 ? "star" : "stars"}`
            : null,
          next.done && s.done < next.done
            ? `${Math.round(next.done * 100)}% of the game done`
            : null,
        ].filter((x): x is string => x !== null)
      : [],
  }
}
