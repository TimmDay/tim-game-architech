import { describe, expect, it } from "vitest"
import { CLIENT_TILE, graph } from "~/levels"
import { CLIENT_ID as C } from "~/sim/types"
import { clientTile, edit, occupied } from "../edit"

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
