import { describe, expect, it } from "vitest"
import { computeTotal, EMPTY } from "../review"
import { UNITS, dayKey, streak, unitsFor, visit } from "../streak"

const day = (d: number, h = 12) => new Date(2026, 9, d, h)

describe("daily streak", () => {
  it("counts days in a row, ending today or yesterday", () => {
    let s = EMPTY
    for (const d of [20, 22, 23, 24]) s = visit(s, day(d)).state
    expect(streak(s, day(24))).toBe(3)
    // Not played yet today: yesterday's streak still stands.
    expect(streak(s, day(25))).toBe(3)
    // A missed day breaks it.
    expect(streak(s, day(26))).toBe(0)
  })

  it("celebrates only the first visit of a day that extends a streak", () => {
    const first = visit(EMPTY, day(1))
    expect(first.celebrate).toBeNull()
    const next = visit(first.state, day(2, 8))
    expect(next.celebrate).toBe(2)
    expect(visit(next.state, day(2, 20)).celebrate).toBeNull()
    expect(visit(next.state, day(4)).celebrate).toBeNull()
  })

  it("uses the player's local day, across a month end", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("day:2026-01-05")
    let s = visit(EMPTY, new Date(2026, 9, 31, 23)).state
    s = visit(s, new Date(2026, 10, 1, 0, 30)).state
    expect(streak(s, new Date(2026, 10, 1))).toBe(2)
  })

  it("is worth no points", () => {
    expect(computeTotal(visit(EMPTY, day(1)).state)).toBe(0)
  })

  it("climbs a unit a day from a bit, and stops at the last", () => {
    expect(unitsFor(1).map((u) => u.short)).toEqual(["bit"])
    expect(unitsFor(3).map((u) => u.name)).toEqual(["Bit", "Byte", "Kilobyte"])
    expect(unitsFor(400)).toHaveLength(UNITS.length)
  })
})
