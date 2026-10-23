import { describe, expect, it } from "vitest"
import { DECKS } from "~/decks"
import { LEVELS } from "~/levels"
import { PASS_MARK, QUIZZES } from "../questions"

describe.each(LEVELS.map((l) => [l.id] as const))("%s quiz", (id) => {
  const quiz = QUIZZES[id] ?? []

  it("has ten questions, and a pass mark of 80%", () => {
    expect(quiz.length).toBe(10)
    expect(PASS_MARK / quiz.length).toBe(0.8)
  })

  it("backs every question with a card from this scenario's deck", () => {
    const deck = DECKS[id] ?? []
    for (const q of quiz) expect(deck[q.card], q.prompt).toBeDefined()
  })

  it("gives four distinct options and an explanation", () => {
    for (const q of quiz) {
      expect(new Set([q.correct, ...q.wrong]).size, q.prompt).toBe(4)
      expect(q.why.length).toBeGreaterThan(20)
    }
  })
})

it("doesn't make answer length a reliable tell, either way", () => {
  const all = Object.values(QUIZZES).flat()
  const share = (pick: (c: number, w: number) => boolean) =>
    all.filter((q) => q.wrong.every((w) => pick(q.correct.length, w.length)))
      .length / all.length
  // Chance is 25%: "always pick the longest" (or shortest) mustn't beat it by much.
  expect(share((c, w) => c > w)).toBeLessThan(0.35)
  expect(share((c, w) => c < w)).toBeLessThan(0.35)
})
