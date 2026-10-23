import { describe, expect, it } from "vitest"
import { LEVELS, graph, levelById } from "~/levels"
import { KINDS } from "~/sim/catalogue"
import { findings } from "~/sim/findings"
import { simulate } from "~/sim/simulate"
import { CLIENT_ID as C } from "~/sim/types"
import { discuss, liveFacts, GENERIC_SCENARIO } from "../roles"

describe("component discussion", () => {
  it("has something to say about every kind of component", () => {
    for (const kind of KINDS) {
      const g = graph([["x", kind, 1, 1]], [`${C}>x`])
      const d = discuss(g, "x", GENERIC_SCENARIO, LEVELS[0]!.load)
      expect(d?.role.length).toBeGreaterThan(40)
      expect(d?.tradeoffs.length).toBeGreaterThanOrEqual(2)
    }
  })

  it("says what the cache holds in this level, and what it shields", () => {
    const level = levelById("front-page")!
    const d = discuss(level.reference, "cache", level.scenario, level.load)
    expect(d?.role).toContain("trending articles")
    expect(d?.role).toContain("{sql-primary}")
  })

  it("reports how much a cache answers itself", () => {
    const level = levelById("front-page")!
    const r = simulate(level.reference, level.load)
    expect(liveFacts(level.reference, "cache", r)[0]).toMatch(
      /answers .*\/s itself \(\d+%/,
    )
  })

  it("explains a cache that's the only store on purpose, without a caution", () => {
    const level = levelById("ride-hailing")!
    const d = discuss(level.reference, "live", level.scenario, level.load)
    expect(d?.role).toContain("in memory only")
    expect(d?.caution).toBeUndefined()
  })

  it("explains a standby on a SQL primary", () => {
    const level = levelById("zone-outage")!
    const d = discuss(level.reference, "db", level.scenario, level.load)
    expect(d?.role).toContain("standby")
  })
})

it("flags a load balancer wired straight to a database", () => {
  const g = graph(
    [
      ["lb", "load-balancer", 1, 1],
      ["db", "sql-primary", 2, 1],
    ],
    [`${C}>lb`, "lb>db"],
  )
  const l = LEVELS[0]!.load
  const f = findings(g, l, simulate(g, l))
  expect(
    f.some((x) => x.componentId === "lb" && x.text.includes("straight to")),
  ).toBe(true)
})
