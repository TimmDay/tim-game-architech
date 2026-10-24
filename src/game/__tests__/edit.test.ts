import { describe, expect, it } from "vitest"
import { graph } from "~/levels"
import { CLIENT_ID as C } from "~/sim/types"
import { edit } from "../edit"

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
