import { describe, expect, it } from "vitest"
import { LEVELS, levelById } from "~/levels"
import { isUnlocked } from "../progression"

describe("level progression", () => {
  it("only names levels that exist", () => {
    for (const l of LEVELS)
      for (const r of l.requires)
        expect(levelById(r), `${l.id} → ${r}`).toBeDefined()
  })

  it("starts with exactly one open level", () => {
    expect(LEVELS.filter((l) => isUnlocked(l, {})).map((l) => l.id)).toEqual([
      "first-customers",
    ])
  })

  it("can unlock every level by completing levels in order", () => {
    const progress: Record<string, { stars: number }> = {}
    for (let round = 0; round < LEVELS.length; round++)
      for (const l of LEVELS)
        if (isUnlocked(l, progress)) progress[l.id] = { stars: 1 }
    expect(Object.keys(progress).length).toBe(LEVELS.length)
  })

  it("teaches the concept before the repair level that assumes it", () => {
    const after = (id: string, prereq: string) => {
      const seen = new Set<string>()
      const walk = (x: string) => {
        for (const r of levelById(x)?.requires ?? []) {
          seen.add(r)
          walk(r)
        }
      }
      walk(id)
      expect(seen, `${id} needs ${prereq}`).toContain(prereq)
    }
    after("lost-writes", "front-page") // replicas and read/write splits
    after("black-friday", "front-page") // cache-aside
    after("slow-checkout", "upload-rush") // queues and workers
    after("three-am-page", "zone-outage") // standbys and zones
    after("analytics-ate-prod", "feed-the-analysts") // streams, OLAP
    after("half-the-orders", "feed-the-analysts") // queue vs log
  })
})
