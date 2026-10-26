import { describe, expect, it } from "vitest"
import {
  EMPTY,
  POINTS,
  answerEstimate,
  answerQuestion,
  awardStars,
  computeTotal,
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
  it("gives 1 point for marking a flash card and 2 more for getting it, once each", () => {
    let s = seeCard(EMPTY, "front-page:3", false, t0)
    expect(s.total).toBe(POINTS.flashCard)
    s = seeCard(s, "front-page:3", true, t0)
    s = seeCard(s, "front-page:3", true, t0)
    expect(s.total).toBe(POINTS.flashCard + POINTS.cardGot)
    expect(computeTotal(s)).toBe(s.total)
  })

  it("gives 2 points per correct answer, once, and nothing for a wrong one", () => {
    let s = answerQuestion(EMPTY, "front-page", 0, false, t0)
    expect(s.total).toBe(0)
    s = answerQuestion(s, "front-page", 0, true, t0)
    s = answerQuestion(s, "front-page", 0, true, t0)
    expect(s.total).toBe(POINTS.mcCorrect)
  })

  it("gives 1 point per estimation card, once, and survives a recount", () => {
    let s = answerEstimate(EMPTY, "short-links", 0, false)
    expect(s.total).toBe(0)
    s = answerEstimate(s, "short-links", 0, true)
    s = answerEstimate(s, "short-links", 0, true)
    expect(s.total).toBe(POINTS.estimate)
    expect(computeTotal(s)).toBe(POINTS.estimate)
  })

  it("gives 20 points for passing a scenario, once", () => {
    let s = passScenario(EMPTY, "front-page", t0)
    s = passScenario(s, "front-page", t0 + DAY)
    expect(s.total).toBe(20)
  })

  it("gives 10 points a star, once each, as a level's best rises", () => {
    let s = awardStars(EMPTY, { "front-page": 1 })
    expect(s.total).toBe(10)
    s = awardStars(s, { "front-page": 3 })
    s = awardStars(s, { "front-page": 2 })
    expect(s.total).toBe(30)
    // Recomputed from the award keys, as a merge does.
    expect(computeTotal(s)).toBe(30)
  })
})

describe("retention", () => {
  it("brings back what you got wrong sooner than what you got right", () => {
    let s = seeCard(EMPTY, "a", true, t0)
    s = seeCard(s, "b", false, t0)
    expect(dueQueue(s, t0 + DAY)).toEqual(["card:b"])
    expect(dueQueue(s, t0 + 3 * DAY).sort()).toEqual(["card:a", "card:b"])
  })

  it("pays the first right answer once, then 1 for a card you knew and 2 for one you'd got wrong", () => {
    const s = seeCard(EMPTY, "a", true, t0)
    const first = review(s, "card:a", true, t0 + 3 * DAY)
    expect(first.earned).toBe(POINTS.keptCard)
    expect(first.state.awarded["kept:card:a"]).toBe(true)
    // One-time, so it survives a recount and isn't Retention's own points.
    expect(computeTotal(first.state)).toBe(first.state.total)
    const knew = review(first.state, "card:a", true, t0 + 10 * DAY)
    expect(knew.earned).toBe(POINTS.reviewRight)
    const missed = review(knew.state, "card:a", false, t0 + 30 * DAY)
    const recovered = review(missed.state, "card:a", true, t0 + 31 * DAY)
    expect(recovered.earned).toBe(POINTS.reviewRecovered)
  })

  it("pays a first retain by kind: 1 for a card, 2 for a question, 25 for a scenario", () => {
    let s = answerQuestion(EMPTY, "front-page", 0, true, t0)
    s = passScenario(s, "front-page", t0)
    expect(review(s, "mc:front-page:0", true, t0 + 3 * DAY).earned).toBe(
      POINTS.keptQuestion,
    )
    expect(review(s, "level:front-page", true, t0 + 7 * DAY).earned).toBe(
      POINTS.keptScenario,
    )
  })

  it("counts a card got right in Retention as got, the first time", () => {
    const s = seeCard(EMPTY, "b", false, t0)
    const r = review(s, "card:b", true, t0 + DAY)
    expect(r.earned).toBe(POINTS.keptCard + POINTS.cardGot)
    expect(r.state.awarded["got:b"]).toBe(true)
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
    // The first right answer is a one-time award; the second is Retention's.
    const twice = (s: typeof EMPTY, id: string, device: string) => {
      const once = review(s, id, true, t + 4 * DAY, device).state
      return review(once, id, true, t + 20 * DAY, device).state
    }
    const a = twice(seeCard(EMPTY, "x", true, t), "card:x", "laptop")
    const b = twice(seeCard(EMPTY, "y", true, t), "card:y", "phone")
    const m = mergeReview(a, b)
    expect(m.retention).toEqual({ laptop: 1, phone: 1 })
    const once = POINTS.flashCard + POINTS.cardGot + POINTS.keptCard
    expect(m.total).toBe(once * 2 + 2)
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
      total: POINTS.flashCard + POINTS.cardGot + 7,
      retention: undefined,
    }
    const n = normalize(old, "laptop")
    expect(n.total).toBe(POINTS.flashCard + POINTS.cardGot + 7)
    expect(n.retention).toEqual({ laptop: 7 })
  })
})
