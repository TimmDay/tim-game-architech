import { describe, expect, it } from "vitest"
import { LEVELS, levelById, type Level } from "~/levels"
import { grade } from "~/sim/grade"
import type { Graph } from "~/sim/types"
import { ACHIEVEMENTS, grantAchievements, mark } from "../achievements"
import {
  gradedMoments,
  hintKey,
  MAD_SCIENTIST_PARTS,
  ranKey,
  sandboxMoments,
} from "../moments"
import { EMPTY, type ReviewState } from "../review"

const classic = LEVELS.find((l) => l.track === "classic") as Level
const run = (
  s: ReviewState,
  level: Level,
  graph: Graph = level.reference,
  hadStars = false,
) =>
  gradedMoments(s, {
    level,
    grade: grade(graph, level.load, level.targets, level.chaos.faults),
    provider: "aws",
    now: new Date(2026, 9, 29, 14),
    hadStars,
  })
const has = (s: ReviewState, key: string) => s.awarded[key] === true

describe("moments a graded run marks", () => {
  it("marks a first run that earns three stars, and only the first", () => {
    const once = run(EMPTY, classic)
    expect(has(once, "event:first-try")).toBe(true)
    expect(has(once, ranKey(classic.id))).toBe(true)
    // A failed run first: the next three stars aren't a first try.
    const failed = run(EMPTY, classic, { components: [], edges: [] })
    expect(has(failed, ranKey(classic.id))).toBe(true)
    expect(has(run(failed, classic), "event:first-try")).toBe(false)
    // Stars from before the marker existed count as an earlier run.
    expect(
      has(run(EMPTY, classic, classic.reference, true), "event:first-try"),
    ).toBe(false)
  })

  it("counts a classic as unassisted only while its hint stays shut", () => {
    expect(has(run(EMPTY, classic), "event:unassisted")).toBe(true)
    const peeked = mark(EMPTY, hintKey(classic.id))
    expect(has(run(peeked, classic), "event:unassisted")).toBe(false)
  })

  it("doesn't call a rebuild of the suggested solution under par", () => {
    for (const l of LEVELS.filter((l) => l.mode === "build"))
      expect(has(run(EMPTY, l), "event:under-par"), l.id).toBe(false)
  })

  it("calls the cheaper side of a trade-off under par", () => {
    // Zone Outage's solution keeps a {cache} it could do without.
    const level = levelById("zone-outage") as Level
    const ref = level.reference
    const noCache: Graph = {
      components: ref.components
        .filter((c) => c.kind !== "cache")
        .map((c) => (c.id === "app" ? { ...c, instances: 17 } : c)),
      edges: [
        ...ref.edges.filter((e) => e.from !== "cache" && e.to !== "cache"),
        { id: "app>db", from: "app", to: "db" },
      ],
    }
    expect(
      grade(noCache, level.load, level.targets, level.chaos.faults).stars,
    ).toBe(3)
    expect(has(run(EMPTY, level, noCache), "event:under-par")).toBe(true)
  })

  it("marks a Sandbox design of 20 parts, and not a smaller one", () => {
    const parts = (n: number): Graph => ({
      components: Array.from({ length: n }, (_, i) => ({
        id: `c${i}`,
        kind: "app-server",
        x: i,
        y: 0,
        instances: 1,
        zones: 1,
      })),
      edges: [],
    })
    expect(
      has(
        sandboxMoments(EMPTY, parts(MAD_SCIENTIST_PARTS - 1)),
        "event:mad-scientist",
      ),
    ).toBe(false)
    expect(
      has(
        sandboxMoments(EMPTY, parts(MAD_SCIENTIST_PARTS)),
        "event:mad-scientist",
      ),
    ).toBe(true)
  })
})

describe("shelf achievements", () => {
  it("grants each shelf's achievement for three stars on all of it", () => {
    for (const [track, id] of [
      ["classic", "offer-letter"],
      ["cap", "partition-tolerant"],
      ["ops", "incident-commander"],
      ["ai", "token-economist"],
    ] as const) {
      const shelf = LEVELS.filter((l) => l.track === track)
      expect(shelf.length, track).toBeGreaterThan(0)
      const all = Object.fromEntries(shelf.map((l) => [l.id, { stars: 3 }]))
      const ids = (progress: typeof all) =>
        grantAchievements(EMPTY, { progress, quizzes: {} }).granted.map(
          (a) => a.id,
        )
      expect(ids(all)).toContain(id)
      const [first] = shelf
      expect(ids({ ...all, [first!.id]: { stars: 2 } })).not.toContain(id)
    }
  })

  it("needs three stars on a level for every kind of chaos for Seen it all", () => {
    const everything = Object.fromEntries(
      LEVELS.map((l) => [l.id, { stars: 3 }]),
    )
    const ids = grantAchievements(EMPTY, {
      progress: everything,
      quizzes: {},
    }).granted.map((a) => a.id)
    expect(ids).toContain("seen-it-all")
    expect(ACHIEVEMENTS.find((a) => a.id === "seen-it-all")).toBeDefined()
  })
})
