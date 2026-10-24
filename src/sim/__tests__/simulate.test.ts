import { describe, expect, it } from "vitest"
import { graph } from "~/levels"
import { CLIENT_ID as C, type LoadProfile } from "../types"
import { QUORUM_P99_MS, simulate, topologyAvailability } from "../simulate"

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
    const l = load({
      heavyWriteFraction: 1,
      job: { seconds: 2, cpuBound: true },
    })
    expect(simulate(inline, l).p99Ms).toBeGreaterThan(2_000)
    expect(simulate(queued, l).p99Ms).toBeLessThan(300)
  })

  it("passes on only what its workers get through; the rest waits in the queue", () => {
    const g = graph(
      [
        ["app", "app-server", 0, 0, 2],
        ["q", "queue", 0, 0],
        ["w", "worker", 0, 0, 1],
        ["db", "sql-primary", 0, 0],
      ],
      [`${C}>app`, "app>q", "q>w", "w>db"],
    )
    // One worker, four cores, a second per job: four jobs a second.
    const l = load({
      readFraction: 0.99,
      heavyWriteFraction: 1,
      job: { seconds: 1, cpuBound: true },
    })
    const r = simulate(g, l)
    expect(r.perComponent.db?.writeRps).toBeCloseTo(4)
    expect(r.backlogGrowthRps).toBeCloseTo(6)
  })
})

it("an empty board serves nothing", () => {
  const r = simulate({ components: [], edges: [] }, load())
  expect(r.connected).toBe(false)
  expect(r.errorRate).toBe(1)
  expect(r.availability).toBe(0)
})

describe("partial slow jobs", () => {
  const g = (target: "queue" | "event-stream") =>
    graph(
      [
        ["app", "app-server", 0, 0, 4],
        ["db", "sql-primary", 0, 0],
        ["m", target, 0, 0],
        ["w", "worker", 0, 0, 10],
      ],
      [`${C}>app`, "app>db", "app>m", "m>w"],
    )

  it("queues only the slow share of writes, and still stores every write", () => {
    const r = simulate(g("queue"), load({ heavyWriteFraction: 0.6 }))
    expect(r.perComponent.m?.writeRps).toBeCloseTo(200 * 0.6)
    expect(r.perComponent.db?.writeRps).toBeCloseTo(200)
  })

  it("never thins an event stream: every write is an event", () => {
    const r = simulate(g("event-stream"), load({ heavyWriteFraction: 0.6 }))
    expect(r.perComponent.m?.writeRps).toBeCloseTo(200)
  })

  it("queues every write when there are no slow jobs at all", () => {
    const r = simulate(g("queue"), load({ heavyWriteFraction: 0 }))
    expect(r.perComponent.m?.writeRps).toBeCloseTo(200)
  })
})

it("only queries a search index from the request path, never writes to it", () => {
  const g = graph(
    [
      ["app", "app-server", 0, 0, 4],
      ["s", "search-index", 0, 0],
    ],
    [`${C}>app`, "app>s"],
  )
  const r = simulate(g, load())
  expect(r.perComponent.s?.readRps).toBeCloseTo(800)
  expect(r.perComponent.s?.writeRps).toBe(0)
})

describe("sharding", () => {
  const keys = {
    partitionKeys: [
      { id: "even", label: "Account ID", hotShare: 0, scatterReads: 0 },
      { id: "hot", label: "Day", hotShare: 0.9, scatterReads: 0 },
      { id: "wide", label: "User ID", hotShare: 0, scatterReads: 0.5 },
    ],
  }
  const db = (key: string, shards: number) =>
    graph(
      [
        ["app", "app-server", 0, 0, 10],
        ["db", "sql-primary", 0, 0, 1, 1, { shards, partitionKey: key }],
      ],
      [`${C}>app`, "app>db"],
    )
  const writes = load({ peakRps: 8_000, readFraction: 0.5, ...keys })

  it("ignores shards in a level that offers no partition keys", () => {
    const r = simulate(
      db("even", 4),
      load({ peakRps: 8_000, readFraction: 0.5 }),
    )
    expect(r.perComponent.db?.utilization).toBeCloseTo(4_000 / 3_000)
    expect(r.perComponent.db?.shards).toBeUndefined()
  })

  it("an even key spreads writes, so four shards take four primaries' writes", () => {
    const r = simulate(db("even", 4), writes)
    expect(r.perComponent.db?.utilization).toBeCloseTo(1_000 / 3_000)
    expect(r.errorRate).toBe(0)
  })

  it("a hot key overloads one shard however many there are", () => {
    for (const n of [2, 4, 8]) {
      const r = simulate(db("hot", n), writes)
      expect(r.perComponent.db?.hotShardShare).toBeCloseTo(0.9)
      expect(r.perComponent.db?.utilization).toBeGreaterThan(1)
    }
  })

  it("reads that don't name the key go to every shard and wait for the slowest", () => {
    const even = simulate(db("even", 4), writes)
    const wide = simulate(db("wide", 4), writes)
    expect(wide.perComponent.db?.readRps).toBe(even.perComponent.db?.readRps)
    expect(wide.perComponent.db?.p99Ms).toBeGreaterThan(
      even.perComponent.db?.p99Ms ?? 0,
    )
    expect(wide.availability).toBeLessThan(even.availability)
  })

  it("pays for every shard's primary and standbys", () => {
    expect(simulate(db("even", 4), writes).monthlyCostUsd).toBe(
      70 * 10 + 400 * 4,
    )
  })

  it("uses the level's first key until the player picks one", () => {
    const g = db("even", 4)
    const c = g.components[1]
    if (c) delete c.partitionKey
    expect(simulate(g, writes).perComponent.db?.utilization).toBeCloseTo(
      1_000 / 3_000,
    )
  })
})

describe("consistency during a network split", () => {
  const split = [{ kind: "network-split" as const }]
  const tunable = load({
    peakRps: 300,
    readFraction: 0.5,
    tunableConsistency: true,
  })
  const db = (mode: "strong" | "eventual", copies: number) =>
    graph(
      [
        ["app", "app-server", 0, 0, 4, 2],
        ["db", "sql-primary", 0, 0, copies, copies, { consistency: mode }],
      ],
      [`${C}>app`, "app>db"],
    )
  // A managed {nosql} store keeps three copies, one per zone.
  const kv = (mode: "strong" | "eventual") =>
    graph(
      [
        ["app", "app-server", 0, 0, 4, 2],
        ["db", "nosql", 0, 0, 1, 1, { consistency: mode }],
      ],
      [`${C}>app`, "app>db"],
    )

  it("changes nothing in a level without tunable consistency", () => {
    const plain = load({ peakRps: 300, readFraction: 0.5 })
    const a = simulate(db("strong", 3), plain)
    const b = simulate(db("strong", 3), plain, split)
    expect(b.errorRate).toBe(a.errorRate)
    expect(b.p99Ms).toBe(a.p99Ms)
  })

  it("strong: the minority side is refused, the majority carries on", () => {
    const r = simulate(db("strong", 3), tunable, split)
    expect(r.errorRate).toBeCloseTo(1 / 3)
    expect(r.divergentRps).toBe(0)
  })

  it("strong with two copies: neither side has a majority, so everything is refused", () => {
    expect(simulate(db("strong", 2), tunable, split).errorRate).toBeCloseTo(1)
  })

  it("eventual: nobody is refused, and the cut-off side's writes diverge", () => {
    const r = simulate(kv("eventual"), tunable, split)
    expect(r.errorRate).toBe(0)
    expect(r.divergentRps).toBeCloseTo(150 / 3)
  })

  it("strong costs a cross-zone round trip on every request, split or not", () => {
    const strong = simulate(kv("strong"), tunable)
    const eventual = simulate(kv("eventual"), tunable)
    expect(strong.p99Ms - eventual.p99Ms).toBeCloseTo(QUORUM_P99_MS)
  })

  it("a single-leader SQL primary can't keep serving: it refuses whatever it's set to", () => {
    const r = simulate(db("eventual", 3), tunable, split)
    expect(r.errorRate).toBeCloseTo(1 / 3)
    expect(r.divergentRps).toBe(0)
  })

  it("one copy has nowhere to fail over to, whichever mode it's in", () => {
    for (const mode of ["strong", "eventual"] as const)
      expect(simulate(db(mode, 1), tunable, split).errorRate).toBeCloseTo(1)
  })
})
