import { CATALOGUE } from "~/sim/catalogue"
import { MAX_SHARDS } from "~/sim/simulate"
import type { ComponentKind, Consistency, Graph, Practices } from "~/sim/types"
import { CLIENT_ID } from "~/sim/types"
import { CLIENT_TILE } from "~/levels"

/** Longest note, in characters. */
export const NOTE_MAX = 280

/** A fresh note id, unique on this board. */
export const nextNoteId = (g: Graph) =>
  `note-${1 + Math.max(0, ...(g.notes ?? []).map((n) => Number(n.id.slice(5)) || 0))}`

/** Board size in tiles. */
export const COLS = 12
export const ROWS = 9

export type Action =
  | { type: "place"; kind: ComponentKind; x: number; y: number }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "connect"; from: string; to: string }
  | { type: "remove"; id: string }
  | { type: "remove-edge"; id: string }
  /** What a connection carries. Unset or empty: inferred from its ends. */
  | { type: "set-edge"; id: string; carries?: string[] }
  | ({ type: "set"; id: string } & Settings)
  /** Replaces the design. The player's notes stay: they're their working. */
  | { type: "reset"; graph: Graph }
  | { type: "add-note"; id: string; x: number; y: number }
  | { type: "move-note"; id: string; x: number; y: number }
  /** Empty text deletes the note. */
  | { type: "set-note"; id: string; text: string }
  | { type: "remove-note"; id: string }
  | { type: "clear-notes" }

/** What the sidebar can change on a component. */
export type Settings = {
  instances?: number
  zones?: number
  shards?: number
  partitionKey?: string
  consistency?: Consistency
  /** Regions it runs in, in levels that offer them. */
  regions?: number
  practices?: Practices
}

export const inBounds = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < COLS && y < ROWS

/** The Users block's tile: where it starts, unless the player moved it. */
export const clientTile = (g: Graph) => g.client ?? CLIENT_TILE

export function occupied(g: Graph, x: number, y: number, except?: string) {
  const u = clientTile(g)
  if (except !== CLIENT_ID && x === u.x && y === u.y) return true
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
      if (a.id === CLIENT_ID) return { ...g, client: { x: a.x, y: a.y } }
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
        ...g,
        components: g.components.filter((c) => c.id !== a.id),
        edges: g.edges.filter((e) => e.from !== a.id && e.to !== a.id),
      }
    case "remove-edge":
      return { ...g, edges: g.edges.filter((e) => e.id !== a.id) }
    case "set-edge":
      return {
        ...g,
        edges: g.edges.map((e) => {
          if (e.id !== a.id) return e
          if (a.carries?.length) return { ...e, carries: a.carries }
          return { id: e.id, from: e.from, to: e.to }
        }),
      }
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
          const next = { ...c, instances, zones }
          if (a.shards !== undefined)
            next.shards = Math.min(MAX_SHARDS, Math.max(1, a.shards))
          if (a.partitionKey !== undefined) next.partitionKey = a.partitionKey
          if (a.consistency !== undefined) next.consistency = a.consistency
          if (a.regions !== undefined)
            next.regions = Math.min(3, Math.max(1, a.regions))
          if (a.practices !== undefined) next.practices = a.practices
          return next
        }),
      }
    case "reset":
      return g.notes?.length ? { ...a.graph, notes: g.notes } : a.graph
    case "add-note":
      return {
        ...g,
        notes: [...(g.notes ?? []), { id: a.id, x: a.x, y: a.y, text: "" }],
      }
    case "move-note":
      return {
        ...g,
        notes: g.notes?.map((n) =>
          n.id === a.id ? { ...n, x: a.x, y: a.y } : n,
        ),
      }
    case "set-note": {
      const text = a.text.trim().slice(0, NOTE_MAX)
      return {
        ...g,
        notes: text
          ? g.notes?.map((n) => (n.id === a.id ? { ...n, text } : n))
          : g.notes?.filter((n) => n.id !== a.id),
      }
    }
    case "remove-note":
      return { ...g, notes: g.notes?.filter((n) => n.id !== a.id) }
    case "clear-notes":
      return { components: g.components, edges: g.edges, client: g.client }
  }
}
