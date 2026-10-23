/**
 * Discussion decks: per-scenario prompts that get you talking the way an
 * interview does. Not quiz cards with one right answer: each card's `points`
 * are what a strong answer would cover, and `followUp` is where an interviewer
 * pushes next.
 *
 * Component names are `{kind}` tokens, so the provider toggle renames them.
 */
export type CardCategory =
  | "clarify"
  | "decision"
  | "tradeoff"
  | "alternative"
  | "edge-case"
  | "resilience"
  | "scale"
  | "security"
  | "observability"
  | "product"

export type DeckCard = {
  /** Stable within a deck: progress is stored against it. */
  id: string
  category: CardCategory
  prompt: string
  points: string[]
  followUp?: string
}

/** Interview order: you ask before you design, and you design before you defend. */
export const CATEGORY_ORDER: CardCategory[] = [
  "clarify",
  "product",
  "decision",
  "tradeoff",
  "alternative",
  "scale",
  "edge-case",
  "resilience",
  "security",
  "observability",
]

export const CATEGORY_LABEL: Record<CardCategory, string> = {
  clarify: "Clarifying question",
  product: "Product",
  decision: "Critical decision",
  tradeoff: "Trade-off",
  alternative: "Alternative",
  scale: "Scale",
  "edge-case": "Edge case",
  resilience: "Failure & recovery",
  security: "Security",
  observability: "Observability",
}
