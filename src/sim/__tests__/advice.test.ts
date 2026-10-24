import { describe, expect, it } from "vitest"
import { graph, SANDBOX_LOAD } from "~/levels"
import { report } from "../advice"
import { simulate } from "../simulate"
import { CLIENT_ID as C, type LoadProfile } from "../types"

const run = (g: ReturnType<typeof graph>, load: LoadProfile = SANDBOX_LOAD) =>
  report(g, load, simulate(g, load))

describe("the sandbox report", () => {
  it("says to connect something when nothing is", () => {
    const r = run(graph([["app", "app-server", 1, 1]], []))
    expect(r.status).toBe("broken")
    expect(r.advice[0]?.fix).toContain("Connect")
  })

  it("sizes an overloaded app tier, with the cost", () => {
    const g = graph(
      [
        ["lb", "load-balancer", 0, 0],
        ["app", "app-server", 0, 0, 2, 2],
        ["db", "sql-primary", 0, 0, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db"],
    )
    const r = run(g)
    const a = r.advice.find((x) => x.componentId === "app")
    expect(r.status).toBe("broken")
    // 1,000 requests at 400 each, aiming for 70%: four instances.
    expect(a?.fix).toMatch(/Run 4 instances \(\+2, \$60\/month more\)/)
  })

  it("offers a cache for a database drowning in cacheable reads", () => {
    const g = graph(
      [
        ["app", "app-server", 0, 0, 6, 2],
        ["db", "sql-primary", 0, 0, 2, 2],
      ],
      [`${C}>app`, "app>db"],
    )
    const r = run(g, { ...SANDBOX_LOAD, peakRps: 2_400, readFraction: 0.95 })
    const a = r.advice.find((x) => x.componentId === "db")
    expect(a?.fix).toContain("{cache}")
    expect(a?.consider).toBeDefined()
  })

  it("moves slow jobs behind a queue, with a worker count", () => {
    const g = graph(
      [
        ["app", "app-server", 0, 0, 6, 2],
        ["files", "object-store", 0, 0],
      ],
      [`${C}>app`, "app>files"],
    )
    const r = run(g, { ...SANDBOX_LOAD, heavyWriteFraction: 1 })
    const a = r.advice.find((x) => x.concept === "async-processing")
    expect(a?.fix).toMatch(/\{queue\}.*\d+ \{worker\}/)
  })

  it("flags a single point of failure even when nothing is overloaded", () => {
    const g = graph(
      [
        ["app", "app-server", 0, 0, 4, 2],
        ["db", "sql-primary", 0, 0],
      ],
      [`${C}>app`, "app>db"],
    )
    const r = run(g, { ...SANDBOX_LOAD, peakRps: 200 })
    expect(r.status).toBe("strained")
    expect(r.advice.map((a) => a.concept)).toEqual(["single-point-of-failure"])
  })

  it("reports a healthy design as healthy, with notes", () => {
    const g = graph(
      [
        ["lb", "load-balancer", 0, 0],
        ["app", "app-server", 0, 0, 4, 2],
        ["db", "sql-primary", 0, 0, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db"],
    )
    const r = run(g, { ...SANDBOX_LOAD, peakRps: 400 })
    expect(r.status).toBe("healthy")
    expect(r.notes.length).toBeGreaterThan(0)
  })
})
