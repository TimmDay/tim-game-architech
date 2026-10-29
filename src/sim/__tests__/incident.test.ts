import { describe, expect, it } from "vitest"
import { LEVELS, levelById, type Level } from "~/levels"
import { grade } from "../grade"
import { describeFault, incidentLines } from "../incident"
import { simulate } from "../simulate"
import type { Graph } from "../types"

const zoneOutage = levelById("zone-outage") as Level
/** Zone Outage's solution, all in one zone: the outage takes everything. */
const oneZone: Graph = {
  ...zoneOutage.reference,
  components: zoneOutage.reference.components.map((c) => ({ ...c, zones: 1 })),
}
const play = (level: Level, graph: Graph) => {
  const peak = simulate(graph, level.load)
  const chaos = simulate(graph, level.load, level.chaos.faults)
  const g = grade(graph, level.load, level.targets, level.chaos.faults)
  const verdict = g.checks.find((c) => c.id === "chaos")?.pass
  return {
    hit: incidentLines(graph, peak, chaos, level.targets, { verdict }),
    back: incidentLines(graph, chaos, peak, level.targets, {
      recovering: true,
    }),
    verdict,
  }
}

describe("the incident log", () => {
  it("says what went down and that the round fails", () => {
    const { hit, back } = play(zoneOutage, oneZone)
    expect(hit.map((l) => l.text)).toContain(
      "{app-server} is down: all 16 gone",
    )
    expect(
      hit.some((l) => l.tone === "bad" && l.text.startsWith("Errors at")),
    ).toBe(true)
    expect(back.map((l) => l.text)).toContain("{app-server} is back")
    expect(back.at(-1)?.text).toBe("All clear: errors back to 0.0%")
  })

  it("says the suggested solution holds", () => {
    const { hit } = play(zoneOutage, zoneOutage.reference)
    expect(hit.at(-1)).toEqual({ tone: "good", text: "Held: errors at 0.0%" })
    expect(hit.some((l) => l.tone === "bad")).toBe(false)
  })

  it("never disagrees with the grade: every solution holds, every failed round says so", () => {
    for (const l of LEVELS) {
      const { hit, verdict } = play(l, l.reference)
      expect(verdict, l.id).toBe(true)
      expect(
        hit.some((x) => x.tone === "bad"),
        l.id,
      ).toBe(false)
    }
    for (const l of LEVELS.filter((l) => l.starter)) {
      const { hit, verdict } = play(l, l.starter as Graph)
      if (verdict === false)
        expect(
          hit.some((x) => x.tone === "bad"),
          l.id,
        ).toBe(true)
    }
  })

  it("announces every kind of fault the levels throw", () => {
    for (const l of LEVELS)
      for (const f of l.chaos.faults)
        expect(describeFault(f).length).toBeGreaterThan(5)
  })
})
