import { describe, expect, it } from "vitest"
import { EMPTY, passScenario, seeCard } from "~/game/review"
import {
  EMPTY_SAVE,
  fromCloud,
  isEmpty,
  mergeSave,
  sameSave,
  toCloud,
  type Save,
} from "../save"

const t = Date.UTC(2026, 9, 1)
const save = (o: Partial<Save>): Save => ({ ...EMPTY_SAVE, ...o })

describe("whole-save merging", () => {
  it("keeps the best of both devices", () => {
    const laptop = save({
      progress: { "front-page": { stars: 3 }, "zone-outage": { stars: 1 } },
      quizzes: { "front-page": { best: 9, passed: true } },
      decks: { "front-page": { "front-page:0": "got" } },
      review: passScenario(EMPTY, "front-page", t),
    })
    const phone = save({
      progress: {
        "front-page": { stars: 1 },
        "lost-writes": { stars: 2, diagnosedFirstTry: true },
      },
      quizzes: { "front-page": { best: 6, passed: false } },
      decks: { "front-page": { "front-page:1": "revisit" } },
      review: seeCard(EMPTY, "x", true, t),
    })
    const m = mergeSave(laptop, phone)
    expect(m.progress["front-page"]?.stars).toBe(3)
    expect(m.progress["lost-writes"]?.diagnosedFirstTry).toBe(true)
    expect(m.quizzes["front-page"]).toEqual({ best: 9, passed: true })
    expect(Object.keys(m.decks["front-page"] ?? {})).toHaveLength(2)
    expect(m.review.total).toBe(20 + 1)
  })

  it("is a no-op when merging a save with itself", () => {
    const s = save({
      progress: { a: { stars: 2 } },
      review: passScenario(EMPTY, "a", t),
    })
    expect(sameSave(mergeSave(s, s), s)).toBe(true)
  })

  it("survives the trip to the cloud and back", () => {
    const s = save({
      progress: { a: { stars: 2 } },
      review: passScenario(seeCard(EMPTY, "x", true, t), "a", t),
    })
    const back = fromCloud(JSON.parse(JSON.stringify(toCloud(s))))
    expect(sameSave(back, s)).toBe(true)
    expect(back.review.total).toBe(s.review.total)
  })

  it("never sends undefined to Firestore, which rejects it", () => {
    const c = toCloud(
      save({ progress: { a: { stars: 1, diagnosedFirstTry: undefined } } }),
    )
    expect(JSON.stringify(c)).not.toContain("undefined")
    expect(Object.keys(c.progress.a ?? {})).toEqual(["stars"])
  })

  it("knows an empty save", () => {
    expect(isEmpty(EMPTY_SAVE)).toBe(true)
    expect(isEmpty(fromCloud(undefined))).toBe(true)
  })
})

describe("change detection", () => {
  it("treats the same save with keys in a different order as unchanged", () => {
    const a = save({
      progress: { "a-level": { stars: 1 }, "b-level": { stars: 2 } },
      review: passScenario(passScenario(EMPTY, "x", t), "y", t),
    })
    // Firestore returns maps in its own key order.
    const reordered = fromCloud(
      JSON.parse(
        JSON.stringify(toCloud(a), (_k, v: unknown) =>
          v && typeof v === "object" && !Array.isArray(v)
            ? Object.fromEntries(Object.entries(v).reverse())
            : v,
        ),
      ),
    )
    expect(sameSave(a, reordered)).toBe(true)
  })

  it("notices a real change", () => {
    const a = save({ progress: { x: { stars: 1 } } })
    expect(sameSave(a, save({ progress: { x: { stars: 2 } } }))).toBe(false)
  })
})
