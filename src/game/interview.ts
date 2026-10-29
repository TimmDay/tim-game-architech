import { DECKS } from "~/decks"
import type { CardCategory, DeckCard } from "~/decks/types"
import { ESTIMATES, type EstimateCard } from "~/quiz/estimate"
import { review, seeCard, type ReviewState } from "./review"

/**
 * A mock interview: one classic, 45 minutes, in the phases an interviewer
 * runs. The prompts are the level's own discussion and estimation cards,
 * asked one at a time; the expected points show only after you've answered
 * out loud, and you mark yourself.
 */
export type Prompt =
  | { kind: "card"; card: DeckCard }
  | { kind: "estimate"; index: number; card: EstimateCard }
  /** Draw it on the board, then run the load test. */
  | { kind: "build" }

export type PhaseId =
  "clarify" | "estimate" | "design" | "deep-dive" | "wrap-up"
export type Phase = {
  id: PhaseId
  title: string
  /** What the interviewer is after in this part, in one line. */
  goal: string
  minutes: number
  prompts: Prompt[]
}

const DEEP_DIVE: CardCategory[] = [
  "decision",
  "tradeoff",
  "alternative",
  "scale",
  "edge-case",
]
const WRAP_UP: CardCategory[] = ["resilience", "security", "observability"]

const cards = (deck: DeckCard[], cats: CardCategory[]): Prompt[] =>
  cats.flatMap((cat) =>
    deck
      .filter((c) => c.category === cat)
      .map((card) => ({ kind: "card" as const, card })),
  )

/** Only levels with a deck and estimates can be interviewed: the classics. */
export const canInterview = (levelId: string) =>
  (DECKS[levelId]?.length ?? 0) > 0 && (ESTIMATES[levelId]?.length ?? 0) > 0

export function interviewPlan(levelId: string): Phase[] {
  const deck = DECKS[levelId] ?? []
  const estimates = ESTIMATES[levelId] ?? []
  return [
    {
      id: "clarify",
      title: "Clarify",
      goal: "Ask before you design: who uses it, what matters, how big.",
      minutes: 5,
      prompts: cards(deck, ["clarify", "product"]),
    },
    {
      id: "estimate",
      title: "Estimate",
      goal: "Turn the answers into numbers you can size against.",
      minutes: 5,
      prompts: estimates.map((card, index) => ({
        kind: "estimate" as const,
        index,
        card,
      })),
    },
    {
      id: "design",
      title: "High-level design",
      goal: "Draw the parts and how requests flow, saying why as you go.",
      minutes: 10,
      prompts: [{ kind: "build" }],
    },
    {
      id: "deep-dive",
      title: "Deep dive",
      goal: "Defend the choices that matter, and what you'd do at 10×.",
      minutes: 20,
      prompts: cards(deck, DEEP_DIVE),
    },
    {
      id: "wrap-up",
      title: "Wrap-up",
      goal: "What breaks, who attacks it, and how you'd know.",
      minutes: 5,
      prompts: cards(deck, WRAP_UP),
    },
  ]
}

export const TOTAL_MINUTES = 45

/** A prompt's stable key, for marks. */
export const promptKey = (p: Prompt) =>
  p.kind === "card"
    ? `card:${p.card.id}`
    : p.kind === "estimate"
      ? `est:${p.index}`
      : "build"

export type Mark = "covered" | "missed"

/** How it went, phase by phase: what was covered, and the time it took. */
export function summarise(
  plan: Phase[],
  marks: Record<string, Mark>,
  secondsByPhase: Partial<Record<PhaseId, number>>,
) {
  const phases = plan.map((p) => {
    const keys = p.prompts.map(promptKey)
    return {
      id: p.id,
      title: p.title,
      covered: keys.filter((k) => marks[k] === "covered").length,
      asked: keys.filter((k) => marks[k] !== undefined).length,
      total: keys.length,
      seconds: secondsByPhase[p.id] ?? 0,
      budget: p.minutes * 60,
    }
  })
  const asked = phases.reduce((n, p) => n + p.asked, 0)
  const covered = phases.reduce((n, p) => n + p.covered, 0)
  return {
    phases,
    covered,
    asked,
    /** Share of the prompts asked that were covered: 0 if none were asked. */
    score: asked ? covered / asked : 0,
    missed: plan.flatMap((p) =>
      p.prompts.filter((x) => marks[promptKey(x)] === "missed"),
    ),
  }
}

/**
 * A deck card marked in the interview, as the deck marks it. A card already
 * on the Retention schedule keeps its place unless it's missed: then it goes
 * back to the first box, as a wrong answer in Retention does.
 */
export function markCard(
  s: ReviewState,
  cardId: string,
  m: Mark,
  now: number,
): ReviewState {
  const seen = seeCard(s, cardId, m === "covered", now)
  const id = `card:${cardId}`
  return m === "missed" && s.items[id]
    ? review(seen, id, false, now).state
    : seen
}
