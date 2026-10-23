import { describe, expect, it } from "vitest"
import {
  EMPTY,
  POINTS,
  answerQuestion,
  dueQueue,
  mergeReview,
  normalize,
  bestSurvivalWave,
  clearSurvivalWave,
  passScenario,
  review,
  seeCard,
} from "../review"

const DAY = 24 * 60 * 60 * 1000
const t0 = Date.UTC(2026, 9, 1)

describe("points", () => {
  it("gives 1 point per flash card, once", () => {
    let s = seeCard(EMPTY, "front-page:3", true, t0)
    s = seeCard(s, "front-page:3", false, t0)
    expect(s.total).toBe(POINTS.flashCard)
  })

  it("gives 2 points per correct answer, once, and nothing for a wrong one", () => {
    let s = answerQuestion(EMPTY, "front-page", 0, false, t0)
    expect(s.total).toBe(0)
    s = answerQuestion(s, "front-page", 0, true, t0)
    s = answerQuestion(s, "front-page", 0, true, t0)
    expect(s.total).toBe(POINTS.mcCorrect)
  })

  it("gives 50 points for passing a scenario, once", () => {
    let s = passScenario(EMPTY, "front-page", t0)
    s = passScenario(s, "front-page", t0 + DAY)
    expect(s.total).toBe(POINTS.scenarioPass)
  })
})

describe("retention", () => {
  it("brings back what you got wrong sooner than what you got right", () => {
    let s = seeCard(EMPTY, "a", true, t0)
    s = seeCard(s, "b", false, t0)
    expect(dueQueue(s, t0 + DAY)).toEqual(["card:b"])
    expect(dueQueue(s, t0 + 3 * DAY).sort()).toEqual(["card:a", "card:b"])
  })

  it("is worth 1 for a card you knew and 2 for one you'd got wrong", () => {
    let s = seeCard(EMPTY, "a", true, t0)
    s = seeCard(s, "b", false, t0)
    const knew = review(s, "card:a", true, t0 + 3 * DAY)
    const recovered = review(s, "card:b", true, t0 + DAY)
    expect(knew.earned).toBe(POINTS.reviewRight)
    expect(recovered.earned).toBe(POINTS.reviewRecovered)
  })

  it("spaces a card further out each time you get it right", () => {
    let s = seeCard(EMPTY, "a", true, t0)
    let now = t0
    const gaps: number[] = []
    for (let i = 0; i < 4; i++) {
      const due = s.items["card:a"]?.due ?? 0
      gaps.push(Math.round((due - now) / DAY))
      now = due
      s = review(s, "card:a", true, now).state
    }
    expect(gaps).toEqual([3, 7, 14, 30])
  })

  it("sends a missed card back to tomorrow and marks it weak", () => {
    let s = seeCard(EMPTY, "a", true, t0)
    const r = review(s, "card:a", false, t0 + 3 * DAY)
    s = r.state
    expect(r.earned).toBe(0)
    expect(s.items["card:a"]?.weak).toBe(true)
    expect(s.items["card:a"]?.due).toBe(t0 + 4 * DAY)
  })

  it("offers a passed scenario for a revisit after a week, worth 25", () => {
    const s = passScenario(EMPTY, "front-page", t0)
    expect(dueQueue(s, t0 + 6 * DAY)).toEqual([])
    expect(dueQueue(s, t0 + 7 * DAY)).toEqual(["level:front-page"])
    expect(review(s, "level:front-page", true, t0 + 7 * DAY).earned).toBe(
      POINTS.scenarioRevisit,
    )
  })

  it("puts weak items at the front of the queue", () => {
    let s = seeCard(EMPTY, "a", true, t0)
    s = seeCard(s, "b", false, t0 + DAY)
    expect(dueQueue(s, t0 + 10 * DAY)[0]).toBe("card:b")
  })
})

describe("survival points", () => {
  it("pays 10 per wave the first time it's cleared, and tracks the best", () => {
    let s = EMPTY
    for (const n of [1, 2, 3]) s = clearSurvivalWave(s, n)
    for (const n of [1, 2, 3, 4]) s = clearSurvivalWave(s, n)
    expect(s.total).toBe(4 * POINTS.survivalWave)
    expect(bestSurvivalWave(s)).toBe(4)
  })
})

describe("cross-device merging", () => {
  const t = Date.UTC(2026, 9, 1)
  it("counts a one-time award once, however many devices earned it", () => {
    const a = passScenario(EMPTY, "front-page", t)
    const b = passScenario(EMPTY, "front-page", t + 1000)
    expect(mergeReview(a, b).total).toBe(POINTS.scenarioPass)
  })

  it("adds up retention earned on different devices", () => {
    let a = seeCard(EMPTY, "x", true, t)
    let b = a
    a = review(a, "card:x", true, t + 4 * DAY, "laptop").state
    b = review(b, "card:y", true, t + 4 * DAY, "phone").state
    b = seeCard(b, "y", true, t)
    b = review(b, "card:y", true, t + 4 * DAY, "phone").state
    const m = mergeReview(a, b)
    expect(m.retention).toEqual({ laptop: 1, phone: 1 })
    expect(m.total).toBe(POINTS.flashCard * 2 + 2)
  })

  it("keeps the most recently reviewed copy of each item", () => {
    const a = review(
      seeCard(EMPTY, "x", true, t),
      "card:x",
      true,
      t + 4 * DAY,
      "a",
    ).state
    const b = seeCard(EMPTY, "x", true, t)
    expect(mergeReview(b, a).items["card:x"]?.box).toBe(2)
    expect(mergeReview(a, b).items["card:x"]?.box).toBe(2)
  })

  it("is the same whichever order the devices sync in", () => {
    const a = passScenario(seeCard(EMPTY, "x", false, t), "front-page", t)
    const b = review(
      seeCard(EMPTY, "x", false, t),
      "card:x",
      true,
      t + DAY,
      "phone",
    ).state
    expect(mergeReview(a, b)).toEqual(mergeReview(b, a))
  })

  it("converts an old save without losing points", () => {
    const old = {
      ...seeCard(EMPTY, "x", true, t),
      total: 1 + 7,
      retention: undefined,
    }
    const n = normalize(old, "laptop")
    expect(n.total).toBe(8)
    expect(n.retention).toEqual({ laptop: 7 })
  })
})
