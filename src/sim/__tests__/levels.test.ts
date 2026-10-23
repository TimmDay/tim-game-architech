import { describe, expect, it } from "vitest"
import { LEVELS } from "~/levels"
import { grade } from "../grade"
import { findings, symptomsOnly } from "../findings"
import { monthlyCost } from "../simulate"
import { SOLUTIONS } from "~/levels/solutions"

describe.each(LEVELS)("$id", (level) => {
  it("has a reference solution that earns three stars", () => {
    const g = grade(
      level.reference,
      level.load,
      level.targets,
      level.chaos.faults,
    )
    const failed = g.checks.filter((c) => !c.pass).map((c) => c.id)
    expect(
      failed,
      JSON.stringify({
        p99: g.peak.p99Ms,
        err: g.peak.errorRate,
        cost: g.peak.monthlyCostUsd,
        avail: g.peak.availability,
        chaosErr: g.chaos.errorRate,
        backlog: g.peak.backlogGrowthRps,
      }),
    ).toEqual([])
    expect(g.stars).toBe(3)
  })

  it("has a written walkthrough of its solution", () => {
    const sol = SOLUTIONS[level.id]
    expect(sol?.overview.length).toBeGreaterThan(50)
    expect(sol?.walkthrough.length).toBeGreaterThanOrEqual(2)
    expect(sol?.tradeoffs.length).toBeGreaterThanOrEqual(2)
  })

  it("quotes the reference's real monthly cost", () => {
    const cost = `$${monthlyCost(level.reference)}`
    expect(SOLUTIONS[level.id]?.numbers.join(" ")).toContain(cost)
  })

  it("only uses palette components in its reference", () => {
    for (const c of level.reference.components)
      expect(level.palette).toContain(c.kind)
  })

  if (level.mode === "repair") {
    it("starts broken", () => {
      const starter = level.starter
      expect(starter).toBeDefined()
      if (!starter) return
      const g = grade(starter, level.load, level.targets, level.chaos.faults)
      expect(g.stars).toBeLessThan(3)
    })

    it("names a root cause that exists in the starter", () => {
      const ids = level.starter?.components.map((c) => c.id) ?? []
      expect(ids).toContain(level.rootCause?.componentId)
    })

    it("flags the root cause in its findings", () => {
      const starter = level.starter
      if (!starter) return
      const g = grade(starter, level.load, level.targets, level.chaos.faults)
      const f = findings(
        starter,
        level.load,
        g.peak,
        level.targets,
        g.chaos,
        level.chaos.label,
      )
      expect(
        f.some((x) => x.severity === "error" || x.severity === "warn"),
      ).toBe(true)
    })

    it("shows symptoms without naming the culprit before diagnosis", () => {
      const starter = level.starter
      const root = starter?.components.find(
        (c) => c.id === level.rootCause?.componentId,
      )
      if (!starter || !root) return
      const g = grade(starter, level.load, level.targets, level.chaos.faults)
      const shown = symptomsOnly(
        findings(
          starter,
          level.load,
          g.peak,
          level.targets,
          g.chaos,
          level.chaos.label,
        ),
      )
      expect(shown.length).toBeGreaterThan(0)
      for (const f of shown) {
        expect(f.text).not.toContain(`{${root.kind}}`)
        expect(f.concept).toBeUndefined()
      }
    })
  }
})

describe("lessons the levels are built around", () => {
  it("first customers: two app servers handle peak but not losing one", () => {
    const level = LEVELS.find((l) => l.id === "first-customers")
    if (!level) throw new Error("missing level")
    const two = {
      ...level.reference,
      components: level.reference.components.map((c) =>
        c.kind === "app-server" ? { ...c, instances: 2 } : c,
      ),
    }
    const g = grade(two, level.load, level.targets, level.chaos.faults)
    expect(g.checks.find((c) => c.id === "traffic")?.pass).toBe(true)
    expect(g.checks.find((c) => c.id === "chaos")?.pass).toBe(false)
  })
})
