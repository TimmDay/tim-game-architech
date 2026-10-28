import { describe, expect, it } from "vitest"
import { LEVELS } from "~/levels"
import { grade } from "../grade"
import { findings, symptomsOnly } from "../findings"
import { simulate } from "../simulate"
import { withPractices } from "../practices"
import { SOLUTIONS } from "~/levels/solutions"
import type { Graph, PlacedComponent, Practices } from "../types"
import { CLIENT_ID as C } from "../types"

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
    const cost = simulate(level.reference, level.load).monthlyCostUsd
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
      // Broken by its root cause, not by a missing production setting.
      expect(
        g.checks.filter((c) => !c.pass && c.id !== "practices").length,
      ).toBeGreaterThan(0)
      expect(g.checks.find((c) => c.id === "practices")?.pass).toBe(true)
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
        level.chaos.faults,
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

  it("plug finder: the same origin without the CDN can't take the road trip", () => {
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

  it("web crawler: fetchers with no timeout wait out slow sites and fall behind", () => {
    const l = level("web-crawler")
    const g = patch(l.reference, "fetch", {
      practices: {
        ...l.reference.components.find((c) => c.id === "fetch")?.practices,
        timeouts: false,
      },
    })
    expect(failed(l, g)).toContain("chaos")
  })

  it("web crawler: fetching inside the frontier service fails users", () => {
    const l = level("web-crawler")
    const g = rewire(
      l.reference,
      ["frontier", "fetch"],
      ["app>web", "app>pages"],
    )
    expect(failed(l, g)).toEqual(expect.arrayContaining(["latency", "chaos"]))
  })

  it("web crawler: a retried fetch that isn't keyed by URL is fetched twice", () => {
    const l = level("web-crawler")
    const g = patch(l.reference, "fetch", {
      practices: {
        ...l.reference.components.find((c) => c.id === "fetch")?.practices,
        idempotency: false,
      },
    })
    expect(failed(l, g)).toContain("chaos")
  })

  it("pay button: retries without idempotency keys charge people twice", () => {
    const l = level("pay-button")
    const pay = l.reference.components.find((c) => c.id === "pay")
    const g = patch(l.reference, "pay", {
      practices: { ...pay?.practices, idempotency: false },
    })
    expect(failed(l, g)).toContain("chaos")
  })

  it("pay button: charging inside the request fails once the provider slows", () => {
    const l = level("pay-button")
    const g = rewire(l.reference, ["charges", "pay"], ["app>provider"])
    expect(failed(l, g)).toContain("chaos")
  })

  it("pay button: one ledger instance goes down with its zone", () => {
    const l = level("pay-button")
    const g = patch(l.reference, "ledger", { instances: 1, zones: 1 })
    expect(failed(l, g)).toContain("chaos")
  })

  it("fair share: with no limit in the app, the runaway script reaches every server", () => {
    const l = level("fair-share")
    const app = l.reference.components.find((c) => c.id === "app")
    const g = patch(l.reference, "app", {
      practices: { ...app?.practices, rateLimit: false },
    })
    expect(failed(l, g)).toEqual(["chaos"])
  })

  it("fair share: servers that count alone let the script through", () => {
    const l = level("fair-share")
    // A cache for map data that the app doesn't keep its counters in.
    const g: Graph = {
      components: [
        ...l.reference.components.filter((c) => c.id !== "cache"),
        { id: "tiles", kind: "cache", x: 7, y: 3, instances: 2, zones: 2 },
      ],
      edges: [
        ...l.reference.edges.filter(
          (e) => e.from !== "cache" && e.to !== "cache",
        ),
        { id: "lb>tiles", from: "lb", to: "tiles" },
        { id: "tiles>app", from: "tiles", to: "app" },
        { id: "app>db", from: "app", to: "db" },
      ],
    }
    expect(failed(l, g)).toContain("chaos")
  })

  it("fair share: a managed gateway limits by key, but breaks the budget", () => {
    const l = level("fair-share")
    const g: Graph = {
      components: [
        ...l.reference.components.filter((c) => c.id !== "lb"),
        {
          id: "gw",
          kind: "api-gateway",
          x: 3,
          y: 4,
          instances: 3,
          zones: 1,
          practices: { rateLimit: true, auth: true, alerts: true },
        },
      ],
      edges: [
        ...l.reference.edges.filter((e) => e.from !== "lb" && e.to !== "lb"),
        { id: "dns>gw", from: "dns", to: "gw" },
        { id: "gw>app", from: "gw", to: "app" },
      ],
    }
    expect(failed(l, g)).toContain("budget")
  })

  it("save game: without a cache, the event key overloads at any capacity", () => {
    const l = level("save-game")
    for (const instances of [5, 10]) {
      const g = patch(rewire(l.reference, ["cache"], ["app>saves"]), "saves", {
        instances,
      })
      expect(failed(l, g)).toContain("traffic")
    }
  })

  it("save game: keyed by region or by time of save, one partition takes the load", () => {
    const l = level("save-game")
    for (const partitionKey of ["region", "saved"])
      expect(
        failed(l, patch(l.reference, "saves", { partitionKey })),
      ).toContain("traffic")
  })

  it("save game: refusing saves during a split fails players", () => {
    const l = level("save-game")
    const g = patch(l.reference, "saves", { consistency: "strong" })
    expect(failed(l, g)).toEqual(["chaos"])
  })

  it("sync folder: relaying chunks through the app tier can't scale", () => {
    const l = level("sync-folder")
    const direct = (e: { from: string; to: string }) =>
      e.from === C && e.to === "blobs"
    const relay = (instances: number): Graph => ({
      components: l.reference.components.map((c) =>
        c.id === "app" ? { ...c, instances } : c,
      ),
      edges: [
        ...l.reference.edges.filter((e) => !direct(e)),
        { id: "app>blobs", from: "app", to: "blobs" },
      ],
    })
    for (const instances of [12, 60])
      expect(failed(l, relay(instances))).toContain("traffic")
  })

  it("sync folder: a line from the users that isn't set to carry chunks is a second entrance", () => {
    const l = level("sync-folder")
    const g: Graph = {
      ...l.reference,
      edges: l.reference.edges.map((e) =>
        e.from === C && e.to === "blobs"
          ? { id: e.id, from: e.from, to: e.to }
          : e,
      ),
    }
    expect(failed(l, g)).toContain("traffic")
  })

  it("click counter: writing each click to the hot ad's key fails the ad break", () => {
    const l = level("click-counter")
    const g = patch(
      rewire(l.reference, ["clicks", "agg", "raw"], ["app>counts"]),
      "counts",
      { instances: 20 },
    )
    expect(failed(l, g)).toEqual(expect.arrayContaining(["chaos", "budget"]))
  })

  it("click counter: writing to the warehouse inside the click puts its latency on every redirect", () => {
    const l = level("click-counter")
    const g = rewire(l.reference, ["clicks", "agg"], ["app>raw"])
    expect(failed(l, g)).toContain("latency")
  })

  it("shared doc: keyed by who typed or by time, the edit log overloads", () => {
    const l = level("shared-doc")
    for (const partitionKey of ["user", "time"])
      expect(
        failed(l, patch(l.reference, "edits", { partitionKey })),
      ).toContain("traffic")
  })

  it("shared doc: refusing edits during a split fails editors", () => {
    const l = level("shared-doc")
    const g = patch(l.reference, "edits", { consistency: "strong" })
    expect(failed(l, g)).toEqual(["chaos"])
  })

  it("on schedule: each missing setting fails the chaos round on its own", () => {
    const l = level("on-schedule")
    const without = (id: string, p: Partial<Practices>) => {
      const c = l.reference.components.find((x) => x.id === id)
      return patch(l.reference, id, { practices: { ...c?.practices, ...p } })
    }
    for (const g of [
      without("due", { dlq: false }),
      without("run", { timeouts: false }),
      without("run", { idempotency: false }),
    ])
      expect(failed(l, g)).toContain("chaos")
    // Hung workers are caught by an alert on either the workers or the queue.
    const noAlerts = patch(without("run", { alerts: false }), "due", {
      practices: {
        ...l.reference.components.find((x) => x.id === "due")?.practices,
        alerts: false,
      },
    })
    expect(failed(l, noAlerts)).toContain("chaos")
  })

  it("near me: without a cell cache, even ten index nodes can't keep up", () => {
    const l = level("near-me")
    const g = patch(rewire(l.reference, ["cells"], ["app>geo"]), "geo", {
      instances: 10,
    })
    expect(failed(l, g)).toContain("traffic")
  })

  it("near me: searching by coordinate ranges in SQL overloads the primary", () => {
    const l = level("near-me")
    const g = rewire(l.reference, ["cells", "geo", "changes"])
    expect(failed(l, g)).toContain("traffic")
  })

  it("top players: keying the ranking itself in NoSQL makes the board one hot key", () => {
    const l = level("top-players")
    const g = patch(l.reference, "players", { partitionKey: "board" })
    expect(failed(l, g)).toContain("backlog")
  })

  it("top players: without the sorted sets, or without durable bests, writes go missing", () => {
    const l = level("top-players")
    expect(failed(l, rewire(l.reference, ["ranks"]))).toContain("writes")
    expect(
      failed(l, rewire(l.reference, ["scores", "best", "players"])),
    ).toContain("writes")
  })

  it("worldwide: one region fails distant users and goes dark with the outage", () => {
    const l = level("worldwide")
    const one: Graph = {
      ...l.reference,
      components: l.reference.components.map((c) => ({ ...c, regions: 1 })),
    }
    expect(failed(l, one)).toEqual(expect.arrayContaining(["latency", "chaos"]))
  })

  it("worldwide: strong consistency, or one SQL leader, puts the ocean on every write", () => {
    const l = level("worldwide")
    expect(
      failed(l, patch(l.reference, "kv", { consistency: "strong" })),
    ).toContain("latency")
    expect(
      failed(
        l,
        patch(l.reference, "kv", {
          kind: "sql-primary",
          instances: 2,
          zones: 2,
        }),
      ),
    ).toContain("latency")
  })

  it("offering regions where everyone is close changes nothing until you use them", () => {
    for (const id of ["balance-sheet", "group-chat", "pay-button"]) {
      const l = LEVELS.find((x) => x.id === id)
      expect(l?.load.regions?.farShare).toBe(0)
    }
  })

  it("short links: a NoSQL store for the links earns three stars too", () => {
    const l = level("short-links")
    const g = patch(l.reference, "db", {
      kind: "nosql",
      instances: 1,
      zones: 1,
    })
    expect(failed(l, g)).toEqual([])
  })

  it("overkill works, but costs the third star", () => {
    const first = level("first-customers")
    const cached: Graph = {
      components: [
        ...first.reference.components,
        { id: "cache", kind: "cache", x: 5, y: 2, instances: 1, zones: 1 },
      ],
      edges: [
        ...first.reference.edges.filter((e) => e.id !== "app>db"),
        { id: "app>cache", from: "app", to: "cache" },
        { id: "cache>db", from: "cache", to: "db" },
      ],
    }
    const g = grade(cached, first.load, first.targets, first.chaos.faults)
    expect(g.checks.filter((c) => !c.pass).map((c) => c.id)).toEqual(["lean"])
    expect(g.stars).toBe(2)
    for (const id of ["balance-sheet", "group-chat", "pay-button"]) {
      const l = level(id)
      const db = l.reference.components.find((c) =>
        ["sql-primary", "nosql"].includes(c.kind),
      )
      const two = patch(l.reference, db?.id ?? "", { regions: 2 })
      expect(failed(l, two), id).toContain("lean")
    }
  })

  it("push alerts: a goal's burst queues up and drains, and nothing fails", () => {
    const l = level("push-alerts")
    const r = grade(l.reference, l.load, l.targets, l.chaos.faults)
    expect(r.chaos.backlogGrowthRps).toBeGreaterThan(0)
    expect(r.stars).toBe(3)
  })

  it("push alerts: calling the provider inside the request fails users", () => {
    const l = level("push-alerts")
    const g = rewire(l.reference, ["sends", "push"], ["app>provider"])
    expect(failed(l, g)).toEqual(expect.arrayContaining(["latency", "chaos"]))
  })

  it("push alerts: the provider is sent the notifications, not the inbox loads", () => {
    const l = level("push-alerts")
    const g = rewire(l.reference, ["sends", "push"], ["app>provider"])
    const r = grade(g, l.load, l.targets, l.chaos.faults)
    // 1,200 sends fit a 2,000 quota, so nothing is refused until the goal.
    expect(r.peak.errorRate).toBe(0)
    expect(r.chaos.errorRate).toBeGreaterThan(0)
  })

  it("push alerts: too little quota or too few workers fall behind at a normal peak", () => {
    const l = level("push-alerts")
    expect(
      failed(l, patch(l.reference, "provider", { instances: 10 })),
    ).toContain("backlog")
    expect(failed(l, patch(l.reference, "push", { instances: 1 }))).toContain(
      "backlog",
    )
  })
})

describe("existing levels keep their numbers", () => {
  it("half the orders still splits 25/25 between queue consumers", () => {
    const level = LEVELS.find((l) => l.id === "half-the-orders")
    const starter = level?.starter
    if (!level || !starter) throw new Error("missing level")
    const r = simulate(starter, level.load)
    expect(r.perComponent.search?.writeRps).toBeCloseTo(25)
    expect(r.perComponent.dw?.writeRps).toBeCloseTo(25)
  })

  it("upload rush still queues every upload", () => {
    const level = LEVELS.find((l) => l.id === "upload-rush")
    if (!level) throw new Error("missing level")
    const r = simulate(level.reference, level.load)
    expect(r.perComponent.q?.writeRps).toBeCloseTo(100)
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

  it("balance sheet: a NoSQL ledger that keeps serving lets both sides accept transfers", () => {
    const l = level("balance-sheet")
    const ap = patch(l.reference, "db", {
      kind: "nosql",
      instances: 1,
      consistency: "eventual",
    })
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

  it("fleet tracker: by courier, the biggest courier overloads its shard at any count", () => {
    const l = level("fleet-tracker")
    for (const shards of [4, 8]) {
      const g = patch(l.reference, "db", { partitionKey: "courier", shards })
      expect(failed(l, g)).toContain("traffic")
      expect(concepts(l, g)).toContain("hot-keys")
    }
  })

  it("fleet tracker: by van, dispatch boards ask every shard and p99 misses", () => {
    const l = level("fleet-tracker")
    const g = patch(l.reference, "db", { partitionKey: "van" })
    expect(failed(l, g)).toEqual(["latency"])
  })

  it("clinic records: hashed clinic IDs pass on load but mix countries", () => {
    const l = level("clinic-records")
    const g = patch(l.reference, "db", { partitionKey: "clinic" })
    expect(failed(l, g)).toEqual(["apart"])
    const r = run(l, g)
    const f = findings(g, l.load, r.peak, l.targets, r.chaos, l.chaos.label)
    expect(f.map((x) => x.concept)).toContain("data-isolation")
    expect(f.map((x) => x.text).join(" ")).toMatch(/mixes them on every shard/)
  })

  it("clinic records: five shards keep countries apart but can't hold the biggest", () => {
    const l = level("clinic-records")
    const g = patch(l.reference, "db", { shards: 5 })
    expect(failed(l, g)).toEqual(["apart"])
    const r = run(l, g)
    const f = findings(g, l.load, r.peak, l.targets, r.chaos, l.chaos.label)
    expect(f.map((x) => x.text).join(" ")).toMatch(/at least 6 shards/)
  })

  it("clinic records: by country alone, the biggest country overloads its shard", () => {
    const l = level("clinic-records")
    const g = patch(l.reference, "db", { partitionKey: "country" })
    expect(failed(l, g)).not.toContain("apart")
    expect(failed(l, g)).toContain("traffic")
  })

  it("clinic records: a store with no shards at all fails the rule", () => {
    const l = level("clinic-records")
    const g = patch(l.reference, "db", { shards: 1, partitionKey: undefined })
    expect(failed(l, g)).toContain("apart")
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

  it("like storm: keyed by post, the celebrity's key is overloaded at any capacity", () => {
    const l = level("like-storm")
    for (const instances of [4, 8]) {
      const g = patch(l.reference, "db", { instances, partitionKey: "post" })
      expect(failed(l, g)).toContain("traffic")
      expect(concepts(l, g)).toContain("hot-keys")
    }
  })

  it("like storm: without the cache, count reads overwhelm the store", () => {
    const l = level("like-storm")
    const g: Graph = {
      components: l.reference.components.filter((c) => c.id !== "cache"),
      edges: [
        ...l.reference.edges.filter(
          (e) => e.to !== "cache" && e.from !== "cache",
        ),
        { id: "app>db", from: "app", to: "db" },
      ],
    }
    expect(failed(l, g)).toContain("traffic")
  })

  it("like storm: keyed by who liked, every count is a scan", () => {
    const l = level("like-storm")
    const g = patch(l.reference, "db", { partitionKey: "user" })
    expect(failed(l, g)).toContain("traffic")
  })

  it("like storm: refusing likes during a split fails people", () => {
    const l = level("like-storm")
    const g = patch(l.reference, "db", { consistency: "strong" })
    expect(failed(l, g)).toContain("chaos")
  })

  it("claim your name: a NoSQL store that keeps serving hands one name to two people", () => {
    const l = level("claim-your-name")
    const ap = patch(l.reference, "db", {
      kind: "nosql",
      instances: 8,
      consistency: "eventual",
    })
    expect(failed(l, ap)).toContain("chaos")
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

describe("the production incidents' traps", () => {
  const level = (id: string) => {
    const l = LEVELS.find((x) => x.id === id)
    if (!l) throw new Error(`missing ${id}`)
    return l
  }
  type L = ReturnType<typeof level>
  const run = (l: L, g: Graph) => grade(g, l.load, l.targets, l.chaos.faults)
  const failed = (l: L, g: Graph) =>
    run(l, g)
      .checks.filter((c) => !c.pass)
      .map((c) => c.id)
  const concepts = (l: L, g: Graph) => {
    const r = run(l, g)
    return findings(
      g,
      l.load,
      r.peak,
      l.targets,
      r.chaos,
      l.chaos.label,
      l.chaos.faults,
    ).map((f) => f.concept)
  }
  const set = (
    g: Graph,
    id: string,
    p: PlacedComponent["practices"],
  ): Graph => ({
    ...g,
    components: g.components.map((c) =>
      c.id === id ? { ...c, practices: { ...c.practices, ...p } } : c,
    ),
  })
  const size = (g: Graph, id: string, instances: number): Graph => ({
    ...g,
    components: g.components.map((c) =>
      c.id === id ? { ...c, instances } : c,
    ),
  })

  it("slow partner: workers with no timeout wait out the slowdown and fall behind", () => {
    const l = level("slow-partner")
    const g = set(l.reference, "pay", { timeouts: false })
    expect(failed(l, g)).toContain("chaos")
    expect(concepts(l, g)).toContain("timeouts-and-retries")
    // Twenty of them would wait it out, at more than twice the budget.
    expect(failed(l, size(g, "pay", 20))).toContain("budget")
  })

  it("slow partner: immediate retries pile onto the provider", () => {
    const l = level("slow-partner")
    expect(
      failed(l, set(l.reference, "pay", { retries: "immediate" })),
    ).toContain("chaos")
  })

  it("slow partner: retries without idempotency keys charge people twice", () => {
    const l = level("slow-partner")
    const g = set(l.reference, "pay", { idempotency: false })
    expect(run(l, g).chaos.duplicateRps).toBeGreaterThan(0)
    expect(concepts(l, g)).toContain("idempotency")
  })

  it("slow partner: charging while the customer waits takes the app down with the provider", () => {
    const l = level("slow-partner")
    const sync: Graph = {
      components: l.reference.components.filter(
        (c) => c.id !== "charges" && c.id !== "pay",
      ),
      edges: [
        ...l.reference.edges.filter(
          (e) => !["charges", "pay"].includes(e.from) && e.to !== "charges",
        ),
        { id: "app>provider", from: "app", to: "provider" },
      ],
    }
    expect(failed(l, sync)).toContain("chaos")
  })

  it("poison pill: without a dead-letter queue the previews fall behind, and buying workers breaks the budget", () => {
    const l = level("poison-pill")
    const g = set(l.reference, "jobs", { dlq: false })
    expect(failed(l, g)).toContain("chaos")
    expect(concepts(l, g)).toContain("dead-letter-queue")
    expect(failed(l, size(g, "convert", 13))).toContain("budget")
  })

  it("login flood: with no rate limit, the attack reaches the servers", () => {
    const l = level("login-flood")
    const g = set(l.reference, "lb", { rateLimit: false })
    expect(run(l, g).chaos.errorRate).toBeGreaterThan(0.1)
    expect(concepts(l, g)).toContain("rate-limiting")
  })

  it("login flood: without a sign-in check, the probe gets answers", () => {
    const l = level("login-flood")
    const g = set(l.reference, "app", { auth: false })
    expect(run(l, g).chaos.exposed).toEqual(["app"])
    expect(concepts(l, g)).toContain("authn-authz")
  })

  it("bad migration: nightly backups miss the 15-minute limit, on the database or the files", () => {
    const l = level("bad-migration")
    for (const id of ["db", "files"]) {
      const g = set(l.reference, id, { backups: "daily" })
      expect(failed(l, g)).toEqual(["chaos"])
      expect(concepts(l, g)).toContain("backups-and-rpo")
    }
  })

  it("nobody noticed: with nothing watching, hung workers stay hung", () => {
    const l = level("nobody-noticed")
    const g = set(set(l.reference, "render", { alerts: false }), "jobs", {
      alerts: false,
    })
    expect(failed(l, g)).toContain("chaos")
    expect(concepts(l, g)).toContain("alerting")
  })

  it("nobody noticed: an alert on the queue's age catches them too", () => {
    const l = level("nobody-noticed")
    const g = set(l.reference, "render", { alerts: false })
    expect(run(l, g).chaos.backlogGrowthRps).toBe(0)
  })
})

describe("click counter's priced alternatives", () => {
  it("per-minute counts in SQL pass at the quoted costs", () => {
    const l = LEVELS.find((x) => x.id === "click-counter")
    if (!l) throw new Error("missing click-counter")
    const text = SOLUTIONS["click-counter"]?.alternatives.join(" ") ?? ""
    for (const instances of [1, 2]) {
      const g: Graph = {
        ...l.reference,
        components: l.reference.components.map((c) =>
          c.id === "counts" ? { ...c, kind: "sql-primary", instances } : c,
        ),
      }
      const stakes = l.targets.stakes
      const r = grade(
        stakes ? withPractices(g, stakes) : g,
        l.load,
        l.targets,
        l.chaos.faults,
      )
      expect(r.stars).toBe(3)
      expect(text).toContain(
        `$${r.peak.monthlyCostUsd.toLocaleString("en-US")}`,
      )
    }
  })
})

describe("step counter's traps", () => {
  const l = LEVELS.find((x) => x.id === "step-counter")
  if (!l) throw new Error("missing step-counter")
  const swap = (p: Partial<PlacedComponent>): Graph => ({
    ...l.reference,
    components: l.reference.components.map((c) =>
      c.id === "steps" ? { ...c, ...p } : c,
    ),
  })
  const failed = (g: Graph) =>
    grade(g, l.load, l.targets, l.chaos.faults)
      .checks.filter((c) => !c.pass)
      .map((c) => c.id)

  it("one SQL primary can't take the syncs, standbys or not", () => {
    expect(
      failed(swap({ kind: "sql-primary", instances: 3, zones: 3 })),
    ).toContain("traffic")
  })

  it("queueing the writes for SQL only builds a backlog", () => {
    const g: Graph = {
      components: [
        ...l.reference.components.filter((c) => c.id !== "steps"),
        { id: "q", kind: "queue", x: 6, y: 2, instances: 1, zones: 1 },
        { id: "w", kind: "worker", x: 8, y: 2, instances: 20, zones: 2 },
        { id: "db", kind: "sql-primary", x: 10, y: 4, instances: 2, zones: 2 },
      ],
      edges: [
        ...l.reference.edges.filter((e) => e.to !== "steps"),
        { id: "app>q", from: "app", to: "q" },
        { id: "q>w", from: "q", to: "w" },
        { id: "w>db", from: "w", to: "db" },
        { id: "app>db", from: "app", to: "db" },
      ],
    }
    expect(failed(g)).toEqual(expect.arrayContaining(["backlog"]))
  })

  it("five NoSQL blocks handle a normal day, but not the January spike", () => {
    expect(failed(swap({ instances: 5 }))).toEqual(["chaos"])
  })
})
