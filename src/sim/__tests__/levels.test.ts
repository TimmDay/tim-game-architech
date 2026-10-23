import { describe, expect, it } from "vitest"
import { LEVELS } from "~/levels"
import { grade } from "../grade"
import { findings, symptomsOnly } from "../findings"
import { monthlyCost, simulate } from "../simulate"
import { SOLUTIONS } from "~/levels/solutions"
import type { Graph, PlacedComponent } from "../types"

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
    const cost = monthlyCost(level.reference)
    const text = SOLUTIONS[level.id]?.numbers.join(" ") ?? ""
    expect(
      text.includes(`$${cost}`) ||
        text.includes(`$${cost.toLocaleString("en-US")}`),
      `expected $${cost}`,
    ).toBe(true)
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

describe("the new scenarios' traps", () => {
  const level = (id: string) => {
    const l = LEVELS.find((x) => x.id === id)
    if (!l) throw new Error(`missing ${id}`)
    return l
  }
  const failed = (l: ReturnType<typeof level>, g: typeof l.reference) =>
    grade(g, l.load, l.targets, l.chaos.faults)
      .checks.filter((c) => !c.pass)
      .map((c) => c.id)

  it("receipts: calling OCR from the app fails latency", () => {
    const l = level("shoebox-receipts")
    const g = {
      components: l.reference.components.filter(
        (c) => c.id !== "q" && c.id !== "workers",
      ),
      edges: [
        ...l.reference.edges.filter(
          (e) =>
            !["app>q", "q>workers", "workers>ocr", "workers>db"].includes(e.id),
        ),
        { id: "app>ocr", from: "app", to: "ocr" },
      ],
    }
    expect(failed(l, g)).toContain("latency")
  })

  it("receipts: too little OCR quota falls behind on deadline day", () => {
    const l = level("shoebox-receipts")
    const g = {
      ...l.reference,
      components: l.reference.components.map((c) =>
        c.id === "ocr" ? { ...c, instances: 3 } : c,
      ),
    }
    expect(failed(l, g)).toEqual(["chaos"])
  })

  it("plug finder: without the CDN it fails, and buying servers breaks the budget", () => {
    const l = level("plug-finder")
    const noCdn = {
      components: l.reference.components.filter((c) => c.id !== "cdn"),
      edges: [
        ...l.reference.edges.filter(
          (e) => e.id !== "dns>cdn" && e.id !== "cdn>lb",
        ),
        { id: "dns>lb", from: "dns", to: "lb" },
      ],
    }
    expect(failed(l, noCdn)).toContain("chaos")
    const bigger = {
      ...noCdn,
      components: noCdn.components.map((c) =>
        c.id === "app" ? { ...c, instances: 15 } : c,
      ),
    }
    expect(failed(l, bigger)).toContain("budget")
  })
})

describe("the interview classics' traps", () => {
  const level = (id: string) => {
    const l = LEVELS.find((x) => x.id === id)
    if (!l) throw new Error(`missing ${id}`)
    return l
  }
  const failed = (l: ReturnType<typeof level>, g: typeof l.reference) =>
    grade(g, l.load, l.targets, l.chaos.faults)
      .checks.filter((c) => !c.pass)
      .map((c) => c.id)
  const patch = (g: Graph, id: string, p: Partial<PlacedComponent>): Graph => ({
    ...g,
    components: g.components.map((c) => (c.id === id ? { ...c, ...p } : c)),
  })
  /** Remove components (and their edges), then add edges as `from>to`. */
  const rewire = (g: Graph, remove: string[], add: string[] = []): Graph => ({
    components: g.components.filter((c) => !remove.includes(c.id)),
    edges: [
      ...g.edges.filter(
        (e) => !remove.includes(e.from) && !remove.includes(e.to),
      ),
      ...add.map((s) => {
        const [from = "", to = ""] = s.split(">")
        return { id: s, from, to }
      }),
    ],
  })

  it("short links: one cache node is a single point of failure", () => {
    const l = level("short-links")
    const g = patch(l.reference, "cache", { instances: 1, zones: 1 })
    expect(failed(l, g)).toEqual(["chaos"])
  })

  it("group chat: a SQL primary can't take the messages", () => {
    const l = level("group-chat")
    const g = patch(l.reference, "kv", { kind: "sql-primary", zones: 2 })
    expect(failed(l, g)).toContain("traffic")
  })

  it("home timeline: building timelines at read time fails the spike", () => {
    const l = level("home-timeline")
    const g = rewire(l.reference, ["cache"], ["app>kv"])
    expect(failed(l, g)).toEqual(expect.arrayContaining(["latency", "chaos"]))
  })

  it("ticket drop: holds straight to the database fail the on-sale", () => {
    const l = level("ticket-drop")
    const g = rewire(l.reference, ["line", "admit"], ["app>db"])
    expect(failed(l, g)).toEqual(["chaos"])
  })

  it("video night: no app tier can stand in for the CDN", () => {
    const l = level("video-night")
    const g = patch(rewire(l.reference, ["cdn"], ["dns>lb"]), "app", {
      instances: 20,
    })
    expect(failed(l, g)).toContain("traffic")
  })

  it("ride hailing: pings in a durable store break the budget", () => {
    const l = level("ride-hailing")
    const g = patch(l.reference, "live", { kind: "nosql", zones: 1 })
    expect(failed(l, g)).toContain("budget")
  })

  it("typeahead: a search per keystroke misses the latency budget", () => {
    const l = level("typeahead")
    const g = patch(l.reference, "topk", { kind: "search-index", instances: 1 })
    expect(failed(l, g)).toEqual(["latency"])
  })
})

describe("existing levels keep their numbers", () => {
  it("half the orders still splits 160/160 between queue consumers", () => {
    const level = LEVELS.find((l) => l.id === "half-the-orders")
    const starter = level?.starter
    if (!level || !starter) throw new Error("missing level")
    const r = simulate(starter, level.load)
    expect(r.perComponent.search?.writeRps).toBeCloseTo(160)
    expect(r.perComponent.dw?.writeRps).toBeCloseTo(160)
  })

  it("upload rush still queues every upload", () => {
    const level = LEVELS.find((l) => l.id === "upload-rush")
    if (!level) throw new Error("missing level")
    const r = simulate(level.reference, level.load)
    expect(r.perComponent.q?.writeRps).toBeCloseTo(300)
  })
})

describe("the CAP shelf's traps", () => {
  const level = (id: string) => {
    const l = LEVELS.find((x) => x.id === id)
    if (!l) throw new Error(`missing ${id}`)
    return l
  }
  const run = (l: ReturnType<typeof level>, g: Graph) =>
    grade(g, l.load, l.targets, l.chaos.faults)
  const failed = (l: ReturnType<typeof level>, g: Graph) =>
    run(l, g)
      .checks.filter((c) => !c.pass)
      .map((c) => c.id)
  const concepts = (l: ReturnType<typeof level>, g: Graph) => {
    const r = run(l, g)
    return findings(g, l.load, r.peak, l.targets, r.chaos, l.chaos.label).map(
      (f) => f.concept,
    )
  }
  const patch = (g: Graph, id: string, p: Partial<PlacedComponent>): Graph => ({
    ...g,
    components: g.components.map((c) => (c.id === id ? { ...c, ...p } : c)),
  })

  it("balance sheet: two copies can't form a majority, so a split refuses everything", () => {
    const l = level("balance-sheet")
    const two = patch(l.reference, "db", { instances: 2, zones: 2 })
    expect(failed(l, two)).toEqual(["chaos"])
    expect(concepts(l, two)).toContain("quorum")
  })

  it("balance sheet: keep-serving lets both sides accept transfers", () => {
    const l = level("balance-sheet")
    const ap = patch(l.reference, "db", { consistency: "eventual" })
    expect(failed(l, ap)).toEqual(["chaos"])
    expect(concepts(l, ap)).toContain("cap-theorem")
  })

  it("balance sheet: refusing the cut-off side isn't reported as a failure", () => {
    const l = level("balance-sheet")
    const r = run(l, l.reference)
    const f = findings(
      l.reference,
      l.load,
      r.peak,
      l.targets,
      r.chaos,
      l.chaos.label,
    )
    expect(f.filter((x) => x.severity === "error")).toEqual([])
  })

  it("full basket: refusing during a split fails shoppers", () => {
    const l = level("full-basket")
    const cp = patch(l.reference, "baskets", { consistency: "strong" })
    expect(failed(l, cp)).toEqual(["chaos"])
    expect(concepts(l, cp)).toContain("cap-theorem")
  })

  it("full basket: one SQL primary can't take the basket writes", () => {
    const l = level("full-basket")
    const sql = {
      ...l.reference,
      components: l.reference.components.map((c) =>
        c.id === "baskets"
          ? { ...c, kind: "sql-primary" as const, instances: 3, zones: 3 }
          : c,
      ),
    }
    expect(failed(l, sql)).toContain("traffic")
  })

  it("tenant split: one primary can't take the writes, however many standbys", () => {
    const l = level("tenant-split")
    const one = patch(l.reference, "db", { shards: 1, instances: 3, zones: 3 })
    expect(failed(l, one)).toContain("traffic")
  })

  it("tenant split: by date, every new write lands on one shard, however many", () => {
    const l = level("tenant-split")
    for (const shards of [4, 8]) {
      const g = patch(l.reference, "db", { shards, partitionKey: "created" })
      expect(failed(l, g)).toContain("traffic")
      expect(concepts(l, g)).toContain("hot-keys")
    }
  })

  it("tenant split: by task, opening a task list asks every shard", () => {
    const l = level("tenant-split")
    const g = patch(l.reference, "db", { partitionKey: "task" })
    expect(failed(l, g)).toContain("latency")
    expect(concepts(l, g)).toContain("scatter-gather")
  })

  it("like storm: keyed by post, the celebrity's shard is overloaded at any shard count", () => {
    const l = level("like-storm")
    for (const shards of [5, 8]) {
      const g = patch(l.reference, "db", { shards, partitionKey: "post" })
      expect(failed(l, g)).toContain("traffic")
      expect(concepts(l, g)).toContain("hot-keys")
    }
  })

  it("like storm: refusing likes during a split fails people", () => {
    const l = level("like-storm")
    for (const copies of [2, 3]) {
      const g = patch(l.reference, "db", {
        consistency: "strong",
        instances: copies,
        zones: copies,
      })
      expect(failed(l, g)).toContain("chaos")
    }
  })

  it("claim your name: keep-serving hands one name to two people", () => {
    const l = level("claim-your-name")
    const ap = patch(l.reference, "db", { consistency: "eventual" })
    expect(failed(l, ap)).toEqual(["chaos"])
  })

  it("claim your name: two copies per shard is cheaper, and refuses everything", () => {
    const l = level("claim-your-name")
    const two = patch(l.reference, "db", { instances: 2, zones: 2 })
    expect(failed(l, two)).toEqual(["chaos"])
  })

  it("claim your name: keyed by sign-up time or email domain, one shard takes the rush", () => {
    const l = level("claim-your-name")
    for (const partitionKey of ["signup", "domain"]) {
      const g = patch(l.reference, "db", { partitionKey, shards: 8 })
      expect(failed(l, g)).toContain("traffic")
    }
  })
})
