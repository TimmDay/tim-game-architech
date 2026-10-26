import { describe, expect, it } from "vitest"
import { LEVELS } from "~/levels"
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_POINTS,
  grantAchievements,
  RANKS,
  completion,
  keepRank,
  mark,
  rank,
} from "../achievements"
import { DECKS } from "~/decks"
import { QUIZZES } from "~/quiz/questions"
import { ESTIMATES } from "~/quiz/estimate"
import { SCHEMA } from "~/quiz/schema"
import {
  EMPTY,
  answerQuestion,
  awardStars,
  clearSurvivalWave,
  computeTotal,
  passScenario,
  seeCard,
} from "../review"

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
  /** One-time points from deck cards, one each: `n` of them. */
  const withCards = (n: number) => {
    const awarded: Record<string, true> = {}
    for (const c of Object.values(DECKS).flat().slice(0, n))
      awarded[`flash:${c.id}`] = true
    return { ...EMPTY, awarded, total: computeTotal({ ...EMPTY, awarded }) }
  }

  /** The first `n` build levels played through: every star, card and question. */
  const explored = (n: number) => {
    let s = EMPTY
    const progress: Record<string, { stars: number }> = {}
    for (const l of LEVELS.filter((x) => x.mode === "build").slice(0, n)) {
      progress[l.id] = { stars: 3 }
      s = awardStars(passScenario(s, l.id, 0), { [l.id]: 3 })
      for (const c of DECKS[l.id] ?? []) s = seeCard(s, c.id, true, 0)
      ;(QUIZZES[l.id] ?? []).forEach(
        (_, i) => (s = answerQuestion(s, l.id, i, true, 0)),
      )
    }
    return {
      s: grantAchievements(s, { progress, quizzes: {} }).state,
      progress,
    }
  }

  it("keeps a whole first scenario a Game Modder, and part of a second makes a Spreadsheet Guy", () => {
    expect(rank(EMPTY, {}).title).toBe("Game Modder")
    // Points alone don't climb: every rank after the first asks for stars.
    expect(rank(withCards(2000), {}).title).toBe("Game Modder")
    expect(rank(withCards(2000), {}).needs).toEqual(["4 more stars"])
    const one = explored(1)
    expect(rank(one.s, one.progress).title).toBe("Game Modder")
    // A first star on the second scenario, nothing else of it.
    const second = LEVELS.filter((x) => x.mode === "build")[1]?.id ?? ""
    const progress = { ...one.progress, [second]: { stars: 1 } }
    const s = awardStars(passScenario(one.s, second, 0), { [second]: 1 })
    expect(rank(s, progress).title).toBe("The Spreadsheet Guy")
  })

  it("spaces the early ranks so each one is seen", () => {
    const titles = [1, 2, 3, 4, 5, 6, 8].map((n) => {
      const e = explored(n)
      return rank(e.s, e.progress).title
    })
    expect(titles).toEqual([
      "Game Modder",
      "The Spreadsheet Guy",
      "The Spreadsheet Guy",
      "Student Intern",
      "Student Intern",
      "Slopapotamus",
      "Junior Engineer",
    ])
  })

  it("measures both requirements as shares of the game", () => {
    // Every star but few points: points hold the rank back, and say how many.
    const r = rank(withCards(10), allStars)
    expect(r.title).toBe("Game Modder")
    expect(r.needs).toHaveLength(1)
    expect(r.needs[0]).toMatch(/more points from levels and cards$/)
  })

  it("keeps the top ranks for finishing most of the game", () => {
    const awarded: Record<string, true> = {}
    for (const l of LEVELS) {
      awarded[`pass:${l.id}`] = true
      for (const n of [1, 2, 3]) awarded[`star:${l.id}:${n}`] = true
    }
    for (const l of LEVELS) awarded[`kept:level:${l.id}`] = true
    for (const [id, qs] of Object.entries(QUIZZES))
      qs.forEach((_, i) => {
        awarded[`mc:${id}:${i}`] = true
        awarded[`kept:mc:${id}:${i}`] = true
      })
    for (const [id, qs] of Object.entries(SCHEMA))
      qs.forEach((_, i) => (awarded[`schema:${id}:${i}`] = true))
    for (const [id, cs] of Object.entries(ESTIMATES))
      cs.forEach((_, i) => (awarded[`est:${id}:${i}`] = true))
    for (const d of Object.values(DECKS))
      for (const c of d) {
        awarded[`flash:${c.id}`] = true
        awarded[`got:${c.id}`] = true
        awarded[`kept:card:${c.id}`] = true
      }
    for (const a of ACHIEVEMENTS) awarded[`ach:${a.id}`] = true
    const s = { ...EMPTY, awarded, total: computeTotal({ ...EMPTY, awarded }) }
    expect(completion(s, allStars).value).toBe(1)
    expect(rank(s, allStars).title).toBe("Claude Shannon")
    expect(rank(s, allStars).next).toBeUndefined()
  })

  it("doesn't count Retention or Survival toward rank", () => {
    const s = { ...clearSurvivalWave(EMPTY, 1), retention: { d: 9999 } }
    expect(completion(s, {}).points).toBe(0)
    expect(rank(s, {}).title).toBe("Game Modder")
  })

  it("never takes a rank back once it's been reached", () => {
    const s = keepRank(withCards(2000), allStars)
    const before = rank(s, allStars).title
    expect(before).not.toBe("Game Modder")
    // New content shrinks every share; losing the stars is the extreme case.
    expect(rank(s, {}).title).toBe(before)
    expect(keepRank(s, {})).toBe(s)
  })

  it("records the rank when achievements are granted", () => {
    const { state } = grantAchievements(withCards(2000), {
      progress: allStars,
      quizzes: {},
    })
    expect(rank(state, {}).title).toBe(rank(state, allStars).title)
  })

  it("asks each rank for at least as much as the one before", () => {
    for (let i = 1; i < RANKS.length; i++) {
      const [a, b] = [RANKS[i - 1], RANKS[i]]
      const pts = [a?.points ?? 0, b?.points ?? 0] as const
      const sts = [a?.stars ?? 0, b?.stars ?? 0] as const
      expect(pts[1], b?.title).toBeGreaterThanOrEqual(pts[0])
      expect(sts[1], b?.title).toBeGreaterThanOrEqual(sts[0])
      expect(pts[1] > pts[0] || sts[1] > sts[0], b?.title).toBe(true)
      expect(Math.max(pts[1], sts[1]), b?.title).toBeLessThanOrEqual(1)
    }
  })
})
