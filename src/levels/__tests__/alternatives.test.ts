import { describe, expect, it } from "vitest"
import { levelById } from "~/levels"
import { SOLUTIONS } from "~/levels/solutions"
import { grade } from "~/sim/grade"
import { withPractices } from "~/sim/practices"
import type { ComponentKind, Graph } from "~/sim/types"

const swap = (
  g: Graph,
  id: string,
  kind: ComponentKind,
  instances?: number,
): Graph => ({
  ...g,
  components: g.components.map((c) =>
    c.id === id ? { ...c, kind, instances: instances ?? c.instances } : c,
  ),
})
const bypass = (g: Graph, id: string, from: string, to: string): Graph => ({
  ...g,
  components: g.components.filter((c) => c.id !== id),
  edges: [
    ...g.edges.filter((e) => e.from !== id && e.to !== id),
    { id: `${from}>${to}`, from, to },
  ],
})

/** Designs a solution's alternatives price as passing, built as they say. */
const PRICED: [level: string, build: (g: Graph) => Graph][] = [
  ["plug-finder", (g) => swap(g, "stream", "queue", 1)],
  ["home-timeline", (g) => swap(g, "stream", "queue", 1)],
  ["typeahead", (g) => swap(g, "topk", "nosql", 1)],
  ["short-links", (g) => swap(g, "db", "nosql", 1)],
  ["balance-sheet", (g) => swap(g, "db", "nosql", 1)],
  ["people-you-may-know", (g) => swap(g, "graph", "sql-primary", 1)],
  ["people-you-may-know", (g) => swap(g, "graph", "sql-primary", 2)],
  ["people-you-may-know", (g) => swap(g, "graph", "nosql", 1)],
  ["run-once", (g) => bypass(g, "texts", "dispatch", "send")],
  ["ask-the-intranet", (g) => swap(g, "passages", "search-index", 1)],
  [
    "overnight-tags",
    (g) => ({
      ...g,
      components: [
        ...g.components,
        { id: "line", kind: "queue", x: 0, y: 0, instances: 1, zones: 1 },
      ],
      edges: [
        ...g.edges.filter((e) => e.id !== "nightly>tagger"),
        { id: "nightly>line", from: "nightly", to: "line" },
        { id: "line>tagger", from: "line", to: "tagger" },
      ],
    }),
  ],
  [
    "double-spend",
    (g) => ({
      ...g,
      components: g.components.map((c) =>
        c.id === "wallets"
          ? {
              ...c,
              kind: "sql-primary" as const,
              instances: 3,
              zones: 3,
              consistency: undefined,
            }
          : c,
      ),
    }),
  ],
  ["summary-on-view", (g) => swap(g, "writer", "serverless")],
  ["summary-on-view", (g) => swap(g, "jobs", "event-stream")],
  [
    "summary-on-view",
    (g) => ({
      ...g,
      components: g.components.map((c) =>
        c.id === "writer" ? { ...c, instances: 2, zones: 2 } : c,
      ),
    }),
  ],
  [
    "summary-on-view",
    (g) => ({
      components: [
        ...g.components.map((c) =>
          c.id === "app" ? { ...c, instances: 2 } : c,
        ),
        { id: "cdn", kind: "cdn", x: 0, y: 0, instances: 1, zones: 1 },
      ],
      edges: [
        ...g.edges.filter((e) => e.id !== "client>lb"),
        { id: "client>cdn", from: "client", to: "cdn" },
        { id: "cdn>lb", from: "cdn", to: "lb" },
      ],
    }),
  ],
  [
    "order-placed",
    (g) =>
      swap(swap(g, "q-email", "event-stream", 1), "q-stock", "event-stream", 1),
  ],
]

describe("priced alternatives", () => {
  it.each(PRICED.map(([id, b], i) => [`${id} #${i}`, id, b] as const))(
    "%s passes at the cost its solution quotes",
    (_, id, build) => {
      const l = levelById(id)
      if (!l) throw new Error(`missing ${id}`)
      const stakes = l.targets.stakes
      const g = build(l.reference)
      const r = grade(
        stakes ? withPractices(g, stakes, l.load) : g,
        l.load,
        l.targets,
        l.chaos.faults,
      )
      expect(r.checks.filter((c) => !c.pass).map((c) => c.id)).toEqual([])
      const text = SOLUTIONS[id]?.alternatives.join(" ") ?? ""
      expect(text).toContain(
        `$${r.peak.monthlyCostUsd.toLocaleString("en-US")}`,
      )
    },
  )
})
