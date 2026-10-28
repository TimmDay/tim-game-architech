import { describe, expect, it } from "vitest"
import { levelById } from "~/levels"
import { SOLUTIONS } from "~/levels/solutions"
import { grade } from "~/sim/grade"
import { withPractices } from "~/sim/practices"
import type { Graph } from "~/sim/types"

/** Take a component out and join what fed it to what it fed. */
const without = (g: Graph, id: string): Graph => {
  const ins = g.edges.filter((e) => e.to === id).map((e) => e.from)
  const outs = g.edges.filter((e) => e.from === id).map((e) => e.to)
  const kept = g.edges.filter((e) => e.from !== id && e.to !== id)
  const joined = ins.flatMap((a) =>
    outs
      .filter((b) => !kept.some((e) => e.from === a && e.to === b))
      .map((b) => ({ id: `${a}>${b}`, from: a, to: b })),
  )
  return {
    ...g,
    components: g.components.filter((c) => c.id !== id),
    edges: [...kept, ...joined],
  }
}
const sized = (g: Graph, sizes: Record<string, number>): Graph => ({
  ...g,
  components: g.components.map((c) => ({
    ...c,
    instances: sizes[c.id] ?? c.instances,
  })),
})
/** A {cache} in front of one component, taking everything bound for it. */
const cacheBefore = (g: Graph, id: string): Graph => ({
  ...g,
  components: [
    ...g.components,
    { id: "extra", kind: "cache", x: 0, y: 0, instances: 2, zones: 2 },
  ],
  edges: [
    ...g.edges.map((e) =>
      e.to === id ? { ...e, id: `${e.from}>extra`, to: "extra" } : e,
    ),
    { id: `extra>${id}`, from: "extra", to: id },
  ],
})

/** The other side of each level's trade-off, built the way its text says. */
const OTHER_SIDE: Record<string, (g: Graph) => Graph> = {
  "zone-outage": (g) => sized(without(g, "cache"), { app: 17 }),
  "plug-finder": (g) => sized(without(g, "cache"), { app: 9 }),
  "shared-doc": (g) => sized(without(g, "cache"), { app: 18, edits: 7 }),
  "order-placed": (g) => sized(without(g, "cache"), { app: 5 }),
  "video-night": (g) => cacheBefore(g, "videos"),
  typeahead: (g) => sized(without(g, "cdn"), { app: 22 }),
}

describe("trade-offs", () => {
  it("covers exactly the levels whose solutions list one", () => {
    const listed = Object.entries(SOLUTIONS)
      .filter(([, s]) => s.tradeOffs?.length)
      .map(([id]) => id)
      .sort()
    expect(listed).toEqual(Object.keys(OTHER_SIDE).sort())
  })

  it.each(Object.entries(OTHER_SIDE))(
    "%s: the other side passes too, at the cost the solution quotes",
    (id, build) => {
      const l = levelById(id)
      if (!l) throw new Error(`missing ${id}`)
      const stakes = l.targets.stakes
      const g = build(l.reference)
      const ready = stakes ? withPractices(g, stakes, l.load) : g
      const r = grade(ready, l.load, l.targets, l.chaos.faults)
      expect(
        r.checks.filter((c) => !c.pass).map((c) => c.id),
        id,
      ).toEqual([])
      const text = (SOLUTIONS[id]?.tradeOffs ?? [])
        .map((t) => `${t.save} ${t.spend}`)
        .join(" ")
      expect(text).toContain(
        `$${r.peak.monthlyCostUsd.toLocaleString("en-US")}`,
      )
    },
  )
})
