import { describe, expect, it } from "vitest"
import { CLIENT_TILE, graph } from "~/levels"
import { CLIENT_ID as C, type Graph } from "~/sim/types"
import { NOTE_MAX, clientTile, edit, nextNoteId, occupied } from "../edit"

describe("choosing what a connection carries", () => {
  const g = graph([["blobs", "object-store", 3, 3]], [`${C}>blobs`])
  const id = g.edges[0]?.id ?? ""

  it("records the player's choice on the connection", () => {
    const next = edit(g, { type: "set-edge", id, carries: ["chunks"] })
    expect(next.edges[0]?.carries).toEqual(["chunks"])
  })

  it("goes back to automatic when the choice is cleared", () => {
    const marked = edit(g, { type: "set-edge", id, carries: ["reads"] })
    const cleared = edit(marked, { type: "set-edge", id, carries: [] })
    expect(cleared.edges[0]).not.toHaveProperty("carries")
  })
})

describe("moving the Users block", () => {
  const g = graph([["blobs", "object-store", 3, 3]], [`${C}>blobs`])

  it("moves it, keeps its connections, and frees its old tile", () => {
    const moved = edit(g, { type: "move", id: C, x: 1, y: 7 })
    expect(clientTile(moved)).toEqual({ x: 1, y: 7 })
    expect(moved.edges).toEqual(g.edges)
    expect(occupied(moved, 1, 7)).toBe(true)
    expect(occupied(moved, CLIENT_TILE.x, CLIENT_TILE.y)).toBe(false)
  })

  it("won't land on a component, and survives removing one", () => {
    expect(edit(g, { type: "move", id: C, x: 3, y: 3 })).toBe(g)
    const moved = edit(g, { type: "move", id: C, x: 1, y: 7 })
    expect(edit(moved, { type: "remove", id: "blobs" }).client).toEqual({
      x: 1,
      y: 7,
    })
  })
})

describe("notes", () => {
  const empty: Graph = { components: [], edges: [] }
  const withNote = edit(
    edit(empty, { type: "add-note", id: "note-1", x: 10, y: 20 }),
    {
      type: "set-note",
      id: "note-1",
      text: "  12.5k/s × 0.9 reads  ",
    },
  )

  it("adds, writes, moves and removes a note", () => {
    expect(withNote.notes).toEqual([
      { id: "note-1", x: 10, y: 20, text: "12.5k/s × 0.9 reads" },
    ])
    const moved = edit(withNote, {
      type: "move-note",
      id: "note-1",
      x: -5,
      y: 3,
    })
    expect(moved.notes?.[0]).toMatchObject({ x: -5, y: 3 })
    expect(edit(moved, { type: "remove-note", id: "note-1" }).notes).toEqual([])
  })

  it("deletes a note saved empty", () => {
    expect(
      edit(withNote, { type: "set-note", id: "note-1", text: "   " }).notes,
    ).toEqual([])
  })

  it("caps a note's length", () => {
    const long = edit(withNote, {
      type: "set-note",
      id: "note-1",
      text: "x".repeat(NOTE_MAX + 50),
    })
    expect(long.notes?.[0]?.text).toHaveLength(NOTE_MAX)
  })

  it("keeps notes through a reset, and clears them on request", () => {
    const reset = edit(withNote, { type: "reset", graph: empty })
    expect(reset.notes).toHaveLength(1)
    expect(edit(reset, { type: "clear-notes" }).notes).toBeUndefined()
  })

  it("gives each new note its own id", () => {
    expect(nextNoteId(empty)).toBe("note-1")
    expect(nextNoteId(withNote)).toBe("note-2")
  })
})
