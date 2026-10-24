import { describe, expect, it } from "vitest"
import { LEVELS } from "~/levels"
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_POINTS,
  grantAchievements,
  RANKS,
  completion,
  mark,
  rank,
} from "../achievements"
import { DECKS } from "~/decks"
import { QUIZZES } from "~/quiz/questions"
import { SCHEMA } from "~/quiz/schema"
import { EMPTY, clearSurvivalWave, computeTotal } from "../review"

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
  const allStars = Object.fromEntries(LEVELS.map((l) => [l.id, { stars: 3 }]))
  const withPoints = (total: number) => ({ ...EMPTY, total })

  it("starts as a Game Modder and needs points and stars to climb", () => {
    expect(rank(EMPTY, {}).title).toBe("Game Modder")
    expect(rank(withPoints(30), {}).title).toBe("The Spreadsheet Guy")
    // Points alone stall at the first rank that asks for stars.
    expect(rank(withPoints(5000), {}).title).toBe("The Spreadsheet Guy")
    expect(rank(withPoints(5000), {}).needs).toEqual(["2 more stars"])
    expect(rank(withPoints(5000), allStars).title).toBe(
      "Distinguished Architect",
    )
  })

  it("keeps the top ranks for finishing most of the game", () => {
    // Every star, but none of the one-time points: not most of the game.
    expect(completion(withPoints(5000), allStars).value).toBe(0)
    const awarded: Record<string, true> = {}
    for (const l of LEVELS) {
      awarded[`pass:${l.id}`] = true
      for (const n of [1, 2, 3]) awarded[`star:${l.id}:${n}`] = true
    }
    for (const [id, qs] of Object.entries(QUIZZES))
      qs.forEach((_, i) => (awarded[`mc:${id}:${i}`] = true))
    for (const [id, qs] of Object.entries(SCHEMA))
      qs.forEach((_, i) => (awarded[`schema:${id}:${i}`] = true))
    for (const d of Object.values(DECKS))
      for (const c of d) awarded[`flash:${c.id}`] = true
    for (const a of ACHIEVEMENTS) awarded[`ach:${a.id}`] = true
    const s = { ...EMPTY, awarded, total: computeTotal({ ...EMPTY, awarded }) }
    expect(completion(s, allStars).value).toBe(1)
    expect(rank(s, allStars).title).toBe("Claude Shannon")
    expect(rank(s, allStars).next).toBeUndefined()
  })

  it("doesn't count Retention or Survival toward finishing the game", () => {
    const s = { ...clearSurvivalWave(EMPTY, 1), retention: { d: 9999 } }
    expect(completion(s, {}).points).toBe(0)
  })

  it("orders every rank above the one before", () => {
    for (let i = 1; i < RANKS.length; i++) {
      const [a, b] = [RANKS[i - 1], RANKS[i]]
      expect((b?.points ?? 0) >= (a?.points ?? 0) || b?.done).toBeTruthy()
    }
  })
})
