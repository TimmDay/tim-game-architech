import { describe, expect, it } from "vitest"
import { LEVELS } from "~/levels"
import { DECK_TITLES, DECKS } from ".."
import { TOPICS } from "../topics"
import { CATEGORY_ORDER, type CardCategory } from "../types"

describe.each(LEVELS.map((l) => [l.id] as const))("%s deck", (id) => {
  const deck = DECKS[id] ?? []

  it("has 20 to 25 cards", () => {
    expect(deck.length).toBeGreaterThanOrEqual(20)
    expect(deck.length).toBeLessThanOrEqual(25)
  })

  it("has at least three clarifying questions", () => {
    const n = deck.filter((c) => c.category === "clarify").length
    expect(n).toBeGreaterThanOrEqual(3)
  })

  it("has at least two cards on failure and recovery", () => {
    const n = deck.filter((c) => c.category === "resilience").length
    expect(n).toBeGreaterThanOrEqual(2)
  })

  it("covers every kind of discussion point", () => {
    const has = new Set(deck.map((c) => c.category))
    const required: CardCategory[] = [
      "clarify",
      "decision",
      "tradeoff",
      "alternative",
      "edge-case",
      "resilience",
      "security",
      "observability",
      "product",
    ]
    for (const c of required) expect(has, c).toContain(c)
  })

  it("gives every card at least two discussion points", () => {
    for (const c of deck) {
      expect(c.points.length, c.prompt).toBeGreaterThanOrEqual(2)
      expect(CATEGORY_ORDER).toContain(c.category)
    }
  })

  it("has unique card ids", () => {
    expect(new Set(deck.map((c) => c.id)).size).toBe(deck.length)
  })
})

describe.each(TOPICS.map((t) => [t.id, t] as const))("%s topic", (id, t) => {
  it("has at least four cards, each with two discussion points", () => {
    expect(t.cards.length).toBeGreaterThanOrEqual(4)
    for (const c of t.cards) {
      expect(c.points.length, c.prompt).toBeGreaterThanOrEqual(2)
      expect(CATEGORY_ORDER).toContain(c.category)
    }
  })

  it("is reachable as a deck, with ids no level uses", () => {
    expect(DECKS[id]).toBe(t.cards)
    expect(DECK_TITLES[id]).toBe(t.title)
    expect(LEVELS.some((l) => l.id === id)).toBe(false)
    expect(new Set(t.cards.map((c) => c.id)).size).toBe(t.cards.length)
  })
})
