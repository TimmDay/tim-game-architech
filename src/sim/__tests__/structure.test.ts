import { describe, expect, it } from "vitest"
import { LEVELS, graph, levelById } from "~/levels"
import { grade } from "../grade"
import { structureProblems } from "../structure"
import { simulate } from "../simulate"
import type { Graph, LoadProfile } from "../types"
import { CLIENT_ID as C } from "../types"

const load: LoadProfile = {
  peakRps: 1_000,
  readFraction: 0.8,
  cacheableFraction: 0,
  heavyWriteFraction: 0,
}
const flagged = (g: Graph, l = load) =>
  structureProblems(g, l).map((p) => p.componentId)

describe("designs that couldn't run", () => {
  it("every reference and starter is one that could", () => {
    for (const l of LEVELS) {
      const peak = simulate(l.reference, l.load)
      expect(structureProblems(l.reference, l.load, peak), l.id).toEqual([])
      if (l.starter)
        expect(structureProblems(l.starter, l.load), l.id).toEqual([])
    }
  })

  it("several app servers need a load balancer to share requests", () => {
    const bare = graph([["app", "app-server", 1, 1, 4]], [`${C}>app`])
    expect(flagged(bare)).toEqual(["app"])
    const one = graph([["app", "app-server", 1, 1, 1]], [`${C}>app`])
    expect(flagged(one)).toEqual([])
    const balanced = graph(
      [
        ["lb", "load-balancer", 1, 1],
        ["app", "app-server", 2, 1, 4],
      ],
      [`${C}>lb`, "lb>app"],
    )
    expect(flagged(balanced)).toEqual([])
  })

  it("users can't reach a store, or put work on a queue, without code in between", () => {
    const g = graph(
      [
        ["lb", "load-balancer", 1, 1],
        ["db", "sql-primary", 2, 1],
        ["q", "queue", 2, 2],
      ],
      [`${C}>lb`, "lb>db", "lb>q"],
    )
    expect(flagged(g).sort()).toEqual(["db", "q"])
  })

  it("files may be served from a bucket, directly or through a CDN", () => {
    const g = graph(
      [
        ["cdn", "cdn", 1, 1],
        ["files", "object-store", 2, 1],
        ["more", "object-store", 2, 2],
      ],
      [`${C}>cdn`, "cdn>files", `${C}>more`],
    )
    expect(flagged(g)).toEqual([])
  })

  it("a queue needs code to act on its messages, except loaders into analytics stores", () => {
    const g = graph(
      [
        ["app", "app-server", 1, 1],
        ["q", "queue", 2, 1],
        ["db", "sql-primary", 3, 1],
        ["s", "event-stream", 2, 2],
        ["dw", "data-warehouse", 3, 2],
      ],
      [`${C}>app`, "app>q", "q>db", "app>s", "s>dw"],
    )
    expect(flagged(g)).toEqual(["db"])
  })

  it("a queue of slow jobs needs something to do them, even into a bucket", () => {
    const g = graph(
      [
        ["app", "app-server", 1, 1],
        ["q", "queue", 2, 1],
        ["files", "object-store", 3, 1],
      ],
      [`${C}>app`, "app>q", "q>files"],
    )
    expect(flagged(g)).toEqual([])
    expect(flagged(g, { ...load, heavyWriteFraction: 1 })).toEqual(["files"])
  })

  it("fails the first star, so a loophole can't earn three", () => {
    const l = levelById("first-customers")
    if (!l) throw new Error("missing level")
    const noApp: Graph = {
      components: l.reference.components.filter((c) => c.kind !== "app-server"),
      edges: [
        ...l.reference.edges.filter(
          (e) =>
            !l.reference.components.some(
              (c) =>
                c.kind === "app-server" && (c.id === e.from || c.id === e.to),
            ),
        ),
        { id: "lb>db", from: "lb", to: "db" },
      ],
    }
    const g = grade(noApp, l.load, l.targets, l.chaos.faults)
    expect(g.checks.find((c) => c.id === "structure")?.pass).toBe(false)
    expect(g.stars).toBe(0)
  })
})

describe("code that's asked for something", () => {
  it("needs somewhere to read it from", () => {
    const g = graph(
      [
        ["lb", "load-balancer", 1, 1],
        ["app", "app-server", 2, 1, 2],
        ["q", "queue", 3, 1],
        ["w", "worker", 4, 1],
        ["db", "sql-primary", 5, 1],
      ],
      [`${C}>lb`, "lb>app", "app>q", "q>w", "w>db"],
    )
    const peak = simulate(g, load)
    expect(flagged(g)).toEqual([])
    expect(structureProblems(g, load, peak).map((p) => p.componentId)).toEqual([
      "app",
    ])
  })
})

describe("stores and caches", () => {
  it("a store doesn't pass requests on, though it may publish changes", () => {
    const g = graph(
      [
        ["app", "app-server", 1, 1],
        ["db", "sql-primary", 2, 1],
        ["kv", "nosql", 3, 1],
        ["s", "event-stream", 3, 2],
      ],
      [`${C}>app`, "app>db", "db>kv", "db>s"],
    )
    expect(flagged(g)).toEqual(["db"])
  })

  it("a cache with nothing behind it needs everything put there ahead of time", () => {
    const g = graph(
      [
        ["app", "app-server", 1, 1],
        ["c", "cache", 2, 1],
      ],
      [`${C}>app`, "app>c"],
    )
    expect(flagged(g)).toEqual(["c"])
    expect(flagged(g, { ...load, cacheableFraction: 1 })).toEqual([])
  })
})

describe("a request tier behind a queue", () => {
  it("does the level's jobs at its cores' pace, not an API call's", () => {
    const g = graph(
      [
        ["q", "queue", 1, 1],
        ["app", "app-server", 2, 1],
      ],
      [`${C}>q`, "q>app"],
    )
    const jobs: LoadProfile = {
      ...load,
      readFraction: 0,
      heavyWriteFraction: 1,
      peakRps: 10,
      job: { seconds: 0.5, cpuBound: true },
    }
    // Two cores, half a second each: four jobs a second.
    expect(simulate(g, jobs).perComponent.app?.utilization).toBeCloseTo(2.5)
  })
})

describe("the service a level depends on", () => {
  it("poison pill: uploads that only land in a bucket are previews nobody made", () => {
    const l = levelById("poison-pill")
    if (!l) throw new Error("missing level")
    const files = l.reference.components.find((c) => c.kind === "object-store")
    if (!files) throw new Error("no bucket")
    const g: Graph = {
      ...l.reference,
      edges: [
        ...l.reference.edges.filter((e) => e.from !== C),
        { id: `${C}>${files.id}`, from: C, to: files.id },
      ],
    }
    const r = grade(g, l.load, l.targets, l.chaos.faults)
    expect(r.checks.find((c) => c.id === "jobs")?.pass).toBe(false)
  })

  it("ask the docs: every article must be embedded by the model", () => {
    const l = levelById("ask-the-docs")
    if (!l) throw new Error("missing level")
    const g: Graph = {
      components: l.reference.components.filter((c) => c.id !== "model"),
      edges: l.reference.edges.filter((e) => e.to !== "model"),
    }
    const r = grade(g, l.load, l.targets, l.chaos.faults)
    expect(r.checks.find((c) => c.id === "jobs")?.pass).toBe(false)
  })

  it("shoebox of receipts: every photo must reach the OCR", () => {
    const l = levelById("shoebox-receipts")
    if (!l) throw new Error("missing level")
    const ocr = l.reference.components.find((c) => c.kind === "doc-ai")
    if (!ocr) throw new Error("no OCR")
    const g: Graph = {
      components: l.reference.components.filter((c) => c.id !== ocr.id),
      edges: l.reference.edges.filter(
        (e) => e.from !== ocr.id && e.to !== ocr.id,
      ),
    }
    const r = grade(g, l.load, l.targets, l.chaos.faults)
    expect(r.checks.find((c) => c.id === "jobs")?.pass).toBe(false)
  })
})
