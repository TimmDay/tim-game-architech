import { describe, expect, it } from "vitest"
import { LEVELS } from "~/levels"
import { ESTIMATES } from "../estimate"

describe.each(Object.entries(ESTIMATES))("%s estimation cards", (id, cards) => {
  it("belongs to an interview classic", () => {
    expect(LEVELS.find((l) => l.id === id)?.track).toBe("classic")
  })

  it("has two to five cards, mixing choices and prompts", () => {
    expect(cards.length).toBeGreaterThanOrEqual(2)
    expect(cards.length).toBeLessThanOrEqual(5)
    expect(cards.some((c) => c.kind === "mc")).toBe(true)
    expect(cards.some((c) => c.kind === "talk")).toBe(true)
  })

  it("gives each choice four distinct options and an explanation, and each prompt its points", () => {
    for (const c of cards) {
      if (c.kind === "mc") {
        expect(new Set([c.correct, ...c.wrong]).size, c.prompt).toBe(4)
        expect(c.why.length).toBeGreaterThan(20)
      } else expect(c.points.length).toBeGreaterThanOrEqual(2)
    }
  })
})

it("covers every interview classic", () => {
  const classics = LEVELS.filter((l) => l.track === "classic").map((l) => l.id)
  expect(Object.keys(ESTIMATES).sort()).toEqual(classics.sort())
})

it("doesn't make answer length a reliable tell, either way", () => {
  const all = Object.values(ESTIMATES)
    .flat()
    .flatMap((c) => (c.kind === "mc" ? [c] : []))
  const share = (pick: (c: number, w: number) => boolean) =>
    all.filter((q) => q.wrong.every((w) => pick(q.correct.length, w.length)))
      .length / all.length
  expect(share((c, w) => c > w)).toBeLessThan(0.35)
  expect(share((c, w) => c < w)).toBeLessThan(0.35)
})
