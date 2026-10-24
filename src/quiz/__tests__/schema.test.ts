import { describe, expect, it } from "vitest"
import { LEVELS } from "~/levels"
import { SCHEMA } from "../schema"

describe.each(Object.entries(SCHEMA))("%s schema questions", (id, qs) => {
  it("belongs to a level", () => {
    expect(LEVELS.some((l) => l.id === id)).toBe(true)
  })

  it("has two to five questions, each with four distinct options and an explanation", () => {
    expect(qs.length).toBeGreaterThanOrEqual(2)
    expect(qs.length).toBeLessThanOrEqual(5)
    for (const q of qs) {
      expect(new Set([q.correct, ...q.wrong]).size, q.prompt).toBe(4)
      expect(q.why.length).toBeGreaterThan(20)
    }
  })
})

it("doesn't make answer length a reliable tell, either way", () => {
  const all = Object.values(SCHEMA).flat()
  const share = (pick: (c: number, w: number) => boolean) =>
    all.filter((q) => q.wrong.every((w) => pick(q.correct.length, w.length)))
      .length / all.length
  expect(share((c, w) => c > w)).toBeLessThan(0.35)
  expect(share((c, w) => c < w)).toBeLessThan(0.35)
})
