import { describe, expect, it } from "vitest"
import { graph } from "~/levels"
import { CLIENT_ID as C, type LoadProfile } from "../types"
import { simulate, topologyAvailability } from "../simulate"

const load = (o: Partial<LoadProfile> = {}): LoadProfile => ({
  peakRps: 1_000,
  readFraction: 0.8,
  cacheableFraction: 0,
  heavyWriteFraction: 0,
  ...o,
})

describe("propagation", () => {
  it("a router divides traffic between targets; a caller sends it down every edge", () => {
    const g = graph(
      [
        ["lb", "load-balancer", 0, 0],
        ["a", "app-server", 0, 0, 4],
        ["b", "app-server", 0, 0, 4],
        ["db", "sql-primary", 0, 0],
        ["blobs", "object-store", 0, 0],
      ],
      [`${C}>lb`, "lb>a", "lb>b", "a>db", "a>blobs"],
    )
    const r = simulate(g, load())
    expect(r.perEdge["lb>a"]?.rps).toBeCloseTo(500)
    expect(r.perEdge["lb>b"]?.rps).toBeCloseTo(500)
    expect(r.perEdge["a>db"]?.rps).toBeCloseTo(500)
    expect(r.perEdge["a>blobs"]?.rps).toBeCloseTo(500)
  })

  it("a cache passes only its misses, and every write, to the store behind it", () => {
    const g = graph(
      [
        ["app", "app-server", 0, 0, 4],
        ["cache", "cache", 0, 0],
        ["db", "sql-primary", 0, 0],
      ],
      [`${C}>app`, "app>cache", "cache>db"],
    )
    const r = simulate(g, load({ cacheableFraction: 1 }))
    const db = r.perComponent.db
    expect(db?.writeRps).toBeCloseTo(200)
    expect(db?.readRps).toBeCloseTo(800 * 0.05)
  })

  it("replicas take the reads and the primary takes the writes", () => {
    const g = graph(
      [
        ["app", "app-server", 0, 0, 4],
        ["db", "sql-primary", 0, 0],
        ["r1", "sql-replica", 0, 0],
        ["r2", "sql-replica", 0, 0],
      ],
      [`${C}>app`, "app>db", "app>r1", "app>r2"],
    )
    const r = simulate(g, load())
    expect(r.perComponent.db?.readRps).toBe(0)
    expect(r.perComponent.db?.writeRps).toBeCloseTo(200)
    expect(r.perComponent.r1?.readRps).toBeCloseTo(400)
    expect(r.perComponent.r2?.writeRps).toBe(0)
  })

  it("a queue shares messages out; an event stream gives everyone all of them", () => {
    const mk = (kind: "queue" | "event-stream") =>
      graph(
        [
          ["app", "app-server", 0, 0, 4],
          ["m", kind, 0, 0],
          ["search", "search-index", 0, 0],
          ["dw", "data-warehouse", 0, 0],
        ],
        [`${C}>app`, "app>m", "m>search", "m>dw"],
      )
    const q = simulate(mk("queue"), load())
    const s = simulate(mk("event-stream"), load())
    expect(q.perComponent.search?.writeRps).toBeCloseTo(100)
    expect(s.perComponent.search?.writeRps).toBeCloseTo(200)
    expect(s.perComponent.dw?.writeRps).toBeCloseTo(200)
  })

  it("puts nothing behind a queue on the critical path", () => {
    const g = graph(
      [
        ["app", "app-server", 0, 0, 4],
        ["q", "queue", 0, 0],
        ["w", "worker", 0, 0, 10],
      ],
      [`${C}>app`, "app>q", "q>w"],
    )
    const r = simulate(g, load())
    expect(r.perComponent.w?.behindAsync).toBe(true)
    expect(r.p99Ms).toBeLessThan(500)
  })

  it("grows a backlog when consumers fall behind instead of failing requests", () => {
    const g = graph(
      [
        ["app", "app-server", 0, 0, 4],
        ["q", "queue", 0, 0],
        ["w", "worker", 0, 0, 1],
      ],
      [`${C}>app`, "app>q", "q>w"],
    )
    const r = simulate(g, load())
    expect(r.backlogGrowthRps).toBeCloseTo(150)
    expect(r.errorRate).toBe(0)
  })
})

describe("faults", () => {
  const g = (zones: number) =>
    graph(
      [
        ["lb", "load-balancer", 0, 0],
        ["app", "app-server", 0, 0, 4, zones],
        ["db", "sql-primary", 0, 0, 2, 2],
      ],
      [`${C}>lb`, "lb>app", "app>db"],
    )

  it("a zone outage takes every instance in a single-zone tier", () => {
    const r = simulate(g(1), load(), [{ kind: "zone-outage" }])
    expect(r.perComponent.app?.aliveInstances).toBe(0)
    expect(r.errorRate).toBe(1)
  })

  it("a two-zone tier loses half", () => {
    const r = simulate(g(2), load(), [{ kind: "zone-outage" }])
    expect(r.perComponent.app?.aliveInstances).toBe(2)
    expect(r.perComponent.db?.aliveInstances).toBe(1)
  })

  it("a SQL standby adds availability, not capacity", () => {
    const one = graph([["db", "sql-primary", 0, 0, 1]], [`${C}>db`])
    const two = graph([["db", "sql-primary", 0, 0, 2, 2]], [`${C}>db`])
    const l = load({ peakRps: 1_000, readFraction: 0 })
    expect(simulate(two, l).perComponent.db?.utilization).toBeCloseTo(
      simulate(one, l).perComponent.db?.utilization ?? 0,
    )
    expect(topologyAvailability(two)).toBeGreaterThan(topologyAvailability(one))
  })
})

describe("heavy work", () => {
  it("costs the user its latency when done inline, and nothing once queued", () => {
    const inline = graph([["app", "app-server", 0, 0, 20]], [`${C}>app`])
    const queued = graph(
      [
        ["app", "app-server", 0, 0, 20],
        ["q", "queue", 0, 0],
        ["w", "worker", 0, 0, 10],
      ],
      [`${C}>app`, "app>q", "q>w"],
    )
    const l = load({ heavyWriteFraction: 1 })
    expect(simulate(inline, l).p99Ms).toBeGreaterThan(1_800)
    expect(simulate(queued, l).p99Ms).toBeLessThan(300)
  })
})

it("an empty board serves nothing", () => {
  const r = simulate({ components: [], edges: [] }, load())
  expect(r.connected).toBe(false)
  expect(r.errorRate).toBe(1)
  expect(r.availability).toBe(0)
})
