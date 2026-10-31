import { describe, expect, it } from "vitest"
import { LEVELS } from "~/levels"
import { grade } from "~/sim/grade"
import {
  candidateTwists,
  dailyBest,
  dailyDate,
  dailyFor,
  dailyNumber,
  dailyWins,
  recordDaily,
  shareText,
  winnableTwists,
} from "../daily"
import { computeTotal, EMPTY } from "../review"

const build = LEVELS.filter((l) => l.mode === "build")
const days = (from: string, n: number) => {
  const [y, m, d] = from.split("-").map(Number)
  return Array.from({ length: n }, (_, i) =>
    dailyDate(new Date(y!, m! - 1, d! + i)),
  )
}

describe("the daily puzzle", () => {
  it("numbers days from the first, across a clock change", () => {
    expect(dailyNumber("2026-10-29")).toBe(1)
    expect(dailyNumber("2026-10-30")).toBe(2)
    // Most of Europe and the US change clocks between these.
    expect(dailyNumber("2026-11-02")).toBe(5)
    expect(dailyNumber("2027-10-29")).toBe(366)
  })

  it("is the same puzzle for everyone on a date", () => {
    const a = dailyFor("2026-11-05")
    const b = dailyFor("2026-11-05")
    expect(a.level.id).toBe("daily-2026-11-05")
    expect(b.base.id).toBe(a.base.id)
    expect(b.twist.label).toBe(a.twist.label)
  })

  it("visits every build level before repeating one", () => {
    const ids = days("2026-10-29", build.length).map((d) => dailyFor(d).base.id)
    expect(new Set(ids).size).toBe(build.length)
  })

  it("can always be won: a year of puzzles, each solution at three stars", () => {
    for (const date of days("2026-10-29", 366)) {
      const { level } = dailyFor(date)
      const g = grade(
        level.reference,
        level.load,
        level.targets,
        level.chaos.faults,
      )
      expect(g.stars, `${date} ${level.title}`).toBe(3)
    }
  })

  it("keeps every twist it offers winnable, and offers one on most levels", () => {
    let twisted = 0
    for (const l of build) {
      const ok = winnableTwists(l)
      for (const t of ok) {
        const x = t.apply(l)
        expect(
          grade(x.reference, x.load, x.targets, x.chaos.faults).stars,
          `${l.id}: ${t.label}`,
        ).toBe(3)
      }
      if (ok.length) twisted++
    }
    expect(twisted / build.length).toBeGreaterThan(0.8)
  })

  it("only ever tightens the rules", () => {
    for (const l of build)
      for (const t of candidateTwists(l)) {
        const x = t.apply(l)
        // Growth raises the budget with the traffic, and no further.
        const grows = x.load.peakRps / l.load.peakRps
        expect(x.targets.budgetUsd).toBeLessThanOrEqual(
          Math.ceil((l.targets.budgetUsd * grows) / 100) * 100,
        )
        expect(x.targets.p99Ms).toBeLessThanOrEqual(l.targets.p99Ms)
        expect(x.load.peakRps).toBeGreaterThanOrEqual(l.load.peakRps)
        expect(x.chaos.faults.length).toBeGreaterThanOrEqual(
          l.chaos.faults.length,
        )
      }
  })
})

describe("daily results", () => {
  const date = "2026-11-01"
  const d = dailyFor(date)
  const g = (stars: number, cost: number) =>
    ({ stars, peak: { monthlyCostUsd: cost } }) as Parameters<
      typeof recordDaily
    >[2]

  it("keeps the best run: more stars, then the lower cost", () => {
    let s = recordDaily(EMPTY, date, g(2, 5000))
    s = recordDaily(s, date, g(1, 1000))
    expect(dailyBest(s, date)).toEqual({ stars: 2, cost: 5000 })
    s = recordDaily(s, date, g(3, 9000))
    s = recordDaily(s, date, g(3, 8000))
    s = recordDaily(s, date, g(3, 8500))
    expect(dailyBest(s, date)).toEqual({ stars: 3, cost: 8000 })
    // A dollar cheaper isn't a new record: keys can't be taken back.
    const keys = Object.keys(s.awarded).length
    s = recordDaily(s, date, g(3, 7999))
    expect(Object.keys(s.awarded).length).toBe(keys)
    s = recordDaily(s, date, g(3, 7700))
    expect(dailyBest(s, date)).toEqual({ stars: 3, cost: 7700 })
    expect(dailyBest(s, "2026-11-02")).toBeNull()
  })

  it("pays for three stars once a day, and the total agrees with the markers", () => {
    let s = recordDaily(EMPTY, date, g(3, 9000))
    s = recordDaily(s, date, g(3, 8000))
    expect(dailyWins(s)).toBe(1)
    expect(s.total).toBe(15)
    expect(computeTotal(s)).toBe(s.total)
  })

  it("shares stars, cost and par, with no product names", () => {
    const text = shareText(
      d,
      { stars: 3, cost: Math.round(d.par) - 50 },
      "https://x/#/daily",
    )
    expect(text).toContain("daily, 1 Nov:")
    expect(text).toContain("★★★")
    expect(text).toContain("under par")
    expect(text).not.toMatch(/AWS|Azure|Google|Amazon/)
    const rebuilt = shareText(d, { stars: 3, cost: Math.round(d.par) }, "")
    expect(rebuilt).not.toContain("under par")
  })
})
