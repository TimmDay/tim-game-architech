import { describe, expect, it } from "vitest"
import { LEVELS } from "~/levels"
import { grade } from "../grade"
import { findings, symptomsOnly } from "../findings"

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
