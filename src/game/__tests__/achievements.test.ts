import { describe, expect, it } from "vitest"
import { LEVELS } from "~/levels"
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_POINTS,
  grantAchievements,
  mark,
  rank,
} from "../achievements"
import { EMPTY } from "../review"

const none = { progress: {}, quizzes: {} }

describe("achievements", () => {
  it("grants nothing to a brand-new player", () => {
    expect(grantAchievements(EMPTY, none).granted).toEqual([])
  })

  it("grants retroactively from saved progress, once, with points", () => {
    const progress = { "first-customers": { stars: 3 } }
    const first = grantAchievements(EMPTY, { progress, quizzes: {} })
    expect(first.granted.map((a) => a.id).sort()).toEqual([
      "first-star",
      "load-bearing",
    ])
    expect(first.state.total).toBe(2 * ACHIEVEMENT_POINTS)
    expect(
      grantAchievements(first.state, { progress, quizzes: {} }).granted,
    ).toEqual([])
  })

  it("needs every build level at three stars for Architect", () => {
    const all = Object.fromEntries(
      LEVELS.filter((l) => l.mode === "build").map((l) => [l.id, { stars: 3 }]),
    )
    const ids = grantAchievements(EMPTY, {
      progress: all,
      quizzes: {},
    }).granted.map((a) => a.id)
    expect(ids).toContain("architect")
  })

  it("watches markers for things only seen as they happen", () => {
    let s = mark(EMPTY, "event:penny-pincher")
    for (const p of ["aws", "azure", "gcp", "generic"])
      s = mark(s, `provider:${p}`)
    const ids = grantAchievements(s, none).granted.map((a) => a.id)
    expect(ids).toEqual(expect.arrayContaining(["penny-pincher", "polyglot"]))
  })

  it("has unique ids and plain descriptions", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(
      ACHIEVEMENTS.length,
    )
  })
})

describe("ranks", () => {
  it("climbs with points", () => {
    expect(rank(0).title).toBe("Intern")
    expect(rank(60).title).toBe("Junior Engineer")
    expect(rank(5000).title).toBe("Distinguished Architect")
    expect(rank(5000).next).toBeUndefined()
  })
})
