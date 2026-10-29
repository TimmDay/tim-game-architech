import { describe, expect, it } from "vitest"
import { DECKS } from "~/decks"
import { LEVELS } from "~/levels"
import { ESTIMATES } from "~/quiz/estimate"
import {
  canInterview,
  interviewPlan,
  promptKey,
  summarise,
  TOTAL_MINUTES,
  type Mark,
} from "../interview"

const classics = LEVELS.filter((l) => l.track === "classic")

describe("mock interviews", () => {
  it("can be run on every classic", () => {
    for (const l of classics) expect(canInterview(l.id), l.id).toBe(true)
  })

  it("asks every deck card and estimate once, in 45 minutes", () => {
    for (const l of classics) {
      const plan = interviewPlan(l.id)
      expect(plan.reduce((n, p) => n + p.minutes, 0)).toBe(TOTAL_MINUTES)
      const keys = plan.flatMap((p) => p.prompts.map(promptKey))
      expect(new Set(keys).size, l.id).toBe(keys.length)
      expect(keys.length, l.id).toBe(
        (DECKS[l.id]?.length ?? 0) + (ESTIMATES[l.id]?.length ?? 0) + 1,
      )
    }
  })

  it("asks before it designs, and designs before it defends", () => {
    const plan = interviewPlan(classics[0]!.id)
    expect(plan.map((p) => p.id)).toEqual([
      "clarify",
      "estimate",
      "design",
      "deep-dive",
      "wrap-up",
    ])
    const cat = (i: number) =>
      plan[i]!.prompts.map((p) =>
        p.kind === "card" ? p.card.category : p.kind,
      )
    expect(new Set(cat(0))).toEqual(new Set(["clarify", "product"]))
    expect(cat(2)).toEqual(["build"])
    expect(
      cat(4).every((c) =>
        ["resilience", "security", "observability"].includes(c),
      ),
    ).toBe(true)
  })

  it("scores what was asked, and lists what was missed", () => {
    const plan = interviewPlan(classics[0]!.id)
    const [a, b, c] = plan[0]!.prompts
    const marks: Record<string, Mark> = {
      [promptKey(a!)]: "covered",
      [promptKey(b!)]: "covered",
      [promptKey(c!)]: "missed",
    }
    const s = summarise(plan, marks, { clarify: 400 })
    expect(s.asked).toBe(3)
    expect(s.covered).toBe(2)
    expect(s.score).toBeCloseTo(2 / 3)
    expect(s.missed).toEqual([c])
    expect(s.phases[0]).toMatchObject({ seconds: 400, budget: 300 })
    expect(summarise(plan, {}, {}).score).toBe(0)
  })
})
