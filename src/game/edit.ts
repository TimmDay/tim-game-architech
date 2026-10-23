import { CATALOGUE } from "~/sim/catalogue"
import type { ComponentKind, Graph } from "~/sim/types"
import { CLIENT_ID } from "~/sim/types"
import { CLIENT_TILE } from "~/levels"

/** Board size in tiles. */
export const COLS = 12
export const ROWS = 9

export type Action =
  | { type: "place"; kind: ComponentKind; x: number; y: number }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "connect"; from: string; to: string }
  | { type: "remove"; id: string }
  | { type: "remove-edge"; id: string }
  | { type: "set"; id: string; instances?: number; zones?: number }
  | { type: "reset"; graph: Graph }

export const inBounds = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < COLS && y < ROWS

export function occupied(g: Graph, x: number, y: number, except?: string) {
  if (x === CLIENT_TILE.x && y === CLIENT_TILE.y) return true
  return g.components.some((c) => c.id !== except && c.x === x && c.y === y)
}

function nextId(g: Graph, kind: ComponentKind) {
  let n = 1
  while (g.components.some((c) => c.id === `${kind}-${n}`)) n++
  return `${kind}-${n}`
}

export function canConnect(g: Graph, from: string, to: string) {
  if (from === to || to === CLIENT_ID) return false
  if (g.edges.some((e) => e.from === from && e.to === to)) return false
  return from === CLIENT_ID || g.components.some((c) => c.id === from)
}

/** Pure graph editing. Returns the same object when nothing changed. */
export function edit(g: Graph, a: Action): Graph {
  switch (a.type) {
    case "place": {
      if (!inBounds(a.x, a.y) || occupied(g, a.x, a.y)) return g
      const id = nextId(g, a.kind)
      return {
        ...g,
        components: [
          ...g.components,
          { id, kind: a.kind, x: a.x, y: a.y, instances: 1, zones: 1 },
        ],
      }
    }
    case "move":
      if (!inBounds(a.x, a.y) || occupied(g, a.x, a.y, a.id)) return g
      return {
        ...g,
        components: g.components.map((c) =>
          c.id === a.id ? { ...c, x: a.x, y: a.y } : c,
        ),
      }
    case "connect":
      if (!canConnect(g, a.from, a.to)) return g
      return {
        ...g,
        edges: [
          ...g.edges,
          { id: `${a.from}>${a.to}`, from: a.from, to: a.to },
        ],
      }
    case "remove":
      return {
        components: g.components.filter((c) => c.id !== a.id),
        edges: g.edges.filter((e) => e.from !== a.id && e.to !== a.id),
      }
    case "remove-edge":
      return { ...g, edges: g.edges.filter((e) => e.id !== a.id) }
    case "set":
      return {
        ...g,
        components: g.components.map((c) => {
          if (c.id !== a.id) return c
          const max = CATALOGUE[c.kind].maxInstances
          const instances = Math.min(
            max,
            Math.max(1, a.instances ?? c.instances),
          )
          const zones = Math.min(3, Math.max(1, a.zones ?? c.zones))
          return { ...c, instances, zones }
        }),
      }
    case "reset":
      return a.graph
  }
}
