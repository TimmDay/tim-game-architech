import { DECKS } from "~/decks"
import { LEVELS, type Level } from "~/levels"
import { QUIZZES } from "~/quiz/questions"
import { ESTIMATES } from "~/quiz/estimate"
import { SCHEMA } from "~/quiz/schema"
import { awardValue, keptValue, type ReviewState } from "./review"
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
    | "CalendarCheck"
    | "Briefcase"
    | "Network"
    | "LifeBuoy"
    | "BrainCircuit"
    | "Flag"
    | "Zap"
    | "EyeOff"
    | "Bomb"
    | "FlaskConical"
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
const shelf = (track: Level["track"]) => LEVELS.filter((l) => l.track === track)
const allThree = (c: AchievementContext, levels: Level[]) =>
  levels.every((l) => stars(c, l.id) === 3)

/** Every kind of chaos some level throws, and the levels that throw each. */
const CHAOS = new Map<string, string[]>()
for (const l of LEVELS)
  for (const f of l.chaos.faults)
    CHAOS.set(f.kind, [...(CHAOS.get(f.kind) ?? []), l.id])
export const CHAOS_KINDS = CHAOS.size

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
  {
    id: "daily-driver",
    title: "Daily driver",
    description: "Three stars on seven daily puzzles.",
    icon: "CalendarCheck",
    earned: (c) => count(c.review, "dailywin:") >= 7,
  },
  {
    id: "offer-letter",
    title: "Offer letter",
    description: "Three stars on every classic interview question.",
    icon: "Briefcase",
    earned: (c) => allThree(c, shelf("classic")),
  },
  {
    id: "partition-tolerant",
    title: "Partition tolerant",
    description: "Three stars on every level on the CAP shelf.",
    icon: "Network",
    earned: (c) => allThree(c, shelf("cap")),
  },
  {
    id: "incident-commander",
    title: "Incident commander",
    description: "Three stars on every production incident.",
    icon: "LifeBuoy",
    earned: (c) => allThree(c, shelf("ops")),
  },
  {
    id: "token-economist",
    title: "Token economist",
    description: "Three stars on every AI systems level.",
    icon: "BrainCircuit",
    earned: (c) => allThree(c, shelf("ai")),
  },
  {
    id: "under-par",
    title: "Under par",
    description: "Three stars for less than the suggested solution costs.",
    icon: "Flag",
    earned: (c) => flag(c.review, "event:under-par"),
  },
  {
    id: "first-try",
    title: "First try",
    description: "Three stars on the first run of a level.",
    icon: "Zap",
    earned: (c) => flag(c.review, "event:first-try"),
  },
  {
    id: "unassisted",
    title: "Unassisted",
    description: "Three stars on a classic without opening its hint.",
    icon: "EyeOff",
    earned: (c) => flag(c.review, "event:unassisted"),
  },
  {
    id: "seen-it-all",
    title: "Seen it all",
    description: `Three stars against every kind of chaos: all ${CHAOS_KINDS} of them.`,
    icon: "Bomb",
    earned: (c) =>
      [...CHAOS.values()].every((ids) => ids.some((id) => stars(c, id) === 3)),
  },
  {
    id: "mad-scientist",
    title: "Mad scientist",
    description: "Run a Sandbox design with 20 or more components.",
    icon: "FlaskConical",
    earned: (c) => flag(c.review, "event:mad-scientist"),
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
  if (granted.length === 0) return { state: keepRank(s, ctx.progress), granted }
  const awarded = { ...s.awarded }
  for (const a of granted) awarded[`ach:${a.id}`] = true
  // Achievements pay one-time points, which can lift the rank too.
  return {
    state: keepRank(
      {
        ...s,
        awarded,
        total: s.total + granted.length * ACHIEVEMENT_POINTS,
      },
      ctx.progress,
    ),
    granted,
  }
}

/** A marker with no points: things achievements watch for. */
export const mark = (s: ReviewState, key: string): ReviewState =>
  s.awarded[key] ? s : { ...s, awarded: { ...s.awarded, [key]: true } }

/**
 * One-time awards from content that has an end. Retention counts once per
 * item (its first right answer); its repeats and Survival don't.
 */
const FINITE = [
  "flash:",
  "got:",
  "kept:",
  "mc:",
  "schema:",
  "est:",
  "pass:",
  "star:",
  "ach:",
]
const CARDS = new Set(Object.values(DECKS).flatMap((d) => d.map((c) => c.id)))
  .size
const QUESTIONS = Object.values(QUIZZES).flat().length
const MAX_AWARDS =
  CARDS * (awardValue("flash:") + awardValue("got:") + keptValue("card:")) +
  QUESTIONS * (awardValue("mc:") + keptValue("mc:")) +
  LEVELS.length * keptValue("level:") +
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
  return { stars, points, value: Math.min(stars, points), awards }
}

export { RANKS, type Rank } from "./ranks"
import { RANKS, type Rank } from "./ranks"

/** Where a player stands, as shares of the game: what ranks are measured by. */
type Standing = { points: number; stars: number }

/** How far toward a rank, 0 to 1: the furthest-behind requirement decides. */
const toward = (r: Rank, s: Standing) =>
  Math.min(
    1,
    r.points ? s.points / r.points : 1,
    r.stars ? s.stars / r.stars : 1,
  )

/** The marker for the highest rank reached, by its place in RANKS. */
const RANK_KEY = "rank:"

/** The highest rank the current numbers reach, ignoring what was reached before. */
function reached(review: ReviewState, progress: Progress): number {
  const c = completion(review, progress)
  const s = { points: c.points, stars: c.stars }
  let i = 0
  while (i + 1 < RANKS.length && toward(RANKS[i + 1] as Rank, s) >= 1) i++
  return i
}

/** The best rank ever held: new content lowers the shares, never the rank. */
const held = (review: ReviewState) =>
  Object.keys(review.awarded)
    .filter((k) => k.startsWith(RANK_KEY))
    .reduce((m, k) => Math.max(m, Number(k.slice(RANK_KEY.length)) || 0), 0)

/** Record the rank reached, so it's kept if the game grows. */
export const keepRank = (review: ReviewState, progress: Progress) => {
  const i = reached(review, progress)
  return i > held(review) ? mark(review, `${RANK_KEY}${i}`) : review
}

export function rank(review: ReviewState, progress: Progress) {
  const c = completion(review, progress)
  const s: Standing = { points: c.points, stars: c.stars }
  const i = Math.min(
    RANKS.length - 1,
    Math.max(reached(review, progress), held(review)),
  )
  const next = RANKS[i + 1]
  const morePoints = next?.points
    ? Math.ceil(next.points * MAX_AWARDS) - c.awards
    : 0
  const moreStars = next?.stars
    ? Math.ceil(next.stars * MAX_STARS) - starCount(progress)
    : 0
  return {
    title: RANKS[i]?.title ?? "Game Modder",
    quip: RANKS[i]?.quip ?? "",
    next,
    progress: next ? toward(next, s) : 1,
    /** What's still missing for the next rank, in words. */
    needs: next
      ? [
          morePoints > 0
            ? `${morePoints.toLocaleString("en-US")} more points from levels and cards`
            : null,
          moreStars > 0
            ? `${moreStars} more ${moreStars === 1 ? "star" : "stars"}`
            : null,
        ].filter((x): x is string => x !== null)
      : [],
  }
}
