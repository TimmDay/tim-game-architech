import { describe, expect, it } from "vitest"
import { edgeLabel, nodeLabel } from "../boardLabels"

describe("board labels", () => {
  it("names a component and how many there are", () => {
    expect(nodeLabel({ name: "App server", instances: 3 })).toBe(
      "App server, 3 instances",
    )
    expect(nodeLabel({ name: "App server", instances: 1 })).toBe("App server")
  })

  it("says the load once traffic runs, and when it's too much", () => {
    expect(nodeLabel({ name: "Cache", utilization: 0.634 })).toBe(
      "Cache, 63% load",
    )
    expect(nodeLabel({ name: "Database", utilization: 1.13 })).toBe(
      "Database, 113% load, overloaded",
    )
    expect(nodeLabel({ name: "Database", utilization: Infinity })).toBe(
      "Database, unlimited load, overloaded",
    )
  })

  it("says a dead component is down, not its load", () => {
    expect(nodeLabel({ name: "Worker", utilization: 2, dead: true })).toBe(
      "Worker, down",
    )
  })

  it("mentions shards and selection", () => {
    expect(nodeLabel({ name: "Database", shards: 4, selected: true })).toBe(
      "Database, 4 shards, selected",
    )
  })

  it("names both ends of a connection and what it carries", () => {
    expect(edgeLabel("Users", "Load balancer", "all")).toBe(
      "Connection from Users to Load balancer",
    )
    expect(edgeLabel("App server", "Replica", "reads")).toBe(
      "Connection from App server to Replica, reads",
    )
  })
})
