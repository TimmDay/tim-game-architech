import { graph, mark } from "~/levels"
import { CLIENT_ID as C } from "~/sim/types"
import type { Graph } from "~/sim/types"
import { CACHE_HIT_EFFICIENCY, simulate } from "~/sim/simulate"
import { CATALOGUE, workerJobsPerSecond } from "~/sim/catalogue"
import type { Wave } from "../engine"

/**
 * Two reference players for balance tests: one who sizes each tier
 * sensibly for the wave, and one who never grows past a starter stack.
 */
export function sensible(w: Wave): Graph {
  const { peakRps, readFraction, cacheableFraction, heavyWriteFraction } =
    w.load
  const reads = peakRps * readFraction
  const writes = peakRps - reads
  const hits = reads * cacheableFraction * CACHE_HIT_EFFICIENCY
  // Size for the worst incident: 1.5x traffic, or a zone of three gone.
  const appLoad = peakRps * 1.5
  const perApp = CATALOGUE["app-server"].capacity.readRps
  const apps = Math.min(
    60,
    Math.max(3, Math.ceil((appLoad / perApp / 0.85) * 1.5)),
  )
  const rows: Parameters<typeof graph>[0] = [
    ["dns", "dns", 1, 4],
    ["lb", "load-balancer", 3, 2],
    ["app", "app-server", 5, 4, apps, 3],
    ["cache", "cache", 7, 3, 2, 2],
  ]
  const edges = [`${C}>dns`, "dns>lb", "lb>app", "app>cache"]
  const sql = CATALOGUE["sql-primary"].capacity
  const wants = (id: string) => w.demands.some((d) => d.id === id)
  if (wants("ledger")) {
    // Transactions mean SQL, sharded by customer as far as `tune` needs.
    rows.push(["db", "sql-primary", 9, 3, 3, 3, { shards: 1 }])
    edges.push("cache>db")
  } else if (
    writes * 1.5 > sql.writeRps * 0.8 ||
    (reads - hits) * 1.5 > sql.readRps
  ) {
    const block = CATALOGUE.nosql.capacity
    const blocks = Math.max(
      Math.ceil((writes * 1.5) / block.writeRps / 0.8),
      Math.ceil(((reads - hits) * 1.5) / block.readRps / 0.8),
    )
    rows.push(["kv", "nosql", 9, 3, Math.max(1, blocks)])
    edges.push("cache>kv")
  } else {
    // Three copies over three zones: a failed primary and a lost zone at once
    // still leave one.
    rows.push(["db", "sql-primary", 9, 3, 3, 3])
    edges.push("cache>db")
  }
  if (heavyWriteFraction > 0) {
    const jobs = writes * heavyWriteFraction * 1.5
    const perWorker = workerJobsPerSecond(w.load)
    rows.push(
      ["q", "queue", 6, 7],
      [
        "w",
        "worker",
        8,
        7,
        Math.min(60, Math.ceil(jobs / perWorker / 0.85) + 1),
        3,
      ],
    )
    edges.push("app>q", "q>w")
    // Uploads keep their files; a courier booking keeps nothing.
    if (w.mix === "uploads") {
      rows.push(["blobs", "object-store", 10, 7])
      edges.push("w>blobs")
    }
  }
  const search = wants("search")
  const warehouse = wants("analytics")
  if (search || warehouse) {
    // Every consumer gets every write: an event stream, not a queue.
    const perStream = CATALOGUE["event-stream"].capacity.writeRps
    rows.push([
      "stream",
      "event-stream",
      6,
      1,
      Math.ceil((writes * 1.5) / perStream / 0.8),
    ])
    edges.push("app>stream")
    if (search) {
      const perIndex = CATALOGUE["search-index"].capacity.writeRps
      rows.push([
        "search",
        "search-index",
        9,
        0,
        Math.max(3, Math.ceil((writes * 1.5 * 1.5) / perIndex / 0.8)),
        3,
      ])
      edges.push("stream>search")
    }
    if (warehouse) {
      rows.push(["dw", "data-warehouse", 11, 1])
      edges.push("stream>dw")
    }
  }
  if (wants("carts") && !rows.some((r) => r[1] === "nosql")) {
    // Every write updates a cart, and every read goes there too.
    const block = CATALOGUE.nosql.capacity
    const blocks = Math.max(
      1,
      Math.ceil((writes * 1.5) / block.writeRps / 0.8),
      Math.ceil(((reads - hits) * 1.5) / block.readRps / 0.8),
    )
    rows.push(["carts", "nosql", 9, 5, blocks])
    edges.push("app>carts")
  }
  let g = graph(rows, edges)
  if (wants("media")) {
    rows.push(["cdn", "cdn", 1, 1], ["files", "object-store", 3, 0])
    edges.push(`${C}>cdn`, "cdn>files")
    g = mark(graph(rows, edges), `${C}>cdn`, ["media"])
  }
  return tune(g, w)
}

/**
 * Grow the tiers that hold or work through the data until they'd carry a
 * 1.5x spike with a zone gone, and no further: what a careful player does
 * with the live numbers, and lean enough never to be overkill.
 */
function tune(g: Graph, w: Wave): Graph {
  const worst = { ...w.load, peakRps: w.load.peakRps * 1.5 }
  const grow = (id: string) => {
    const c = g.components.find((x) => x.id === id)
    if (!c) return
    const sharded = c.kind === "sql-primary"
    const max = sharded ? 16 : CATALOGUE[c.kind].maxInstances
    for (;;) {
      const m = simulate(g, worst, [{ kind: "zone-outage" }]).perComponent[id]
      const n = sharded ? (c.shards ?? 1) : c.instances
      if (!m || m.utilization <= 0.9 || n >= max) return
      const next = sharded ? { shards: n + 1 } : { instances: n + 1 }
      g = {
        ...g,
        components: g.components.map((x) =>
          x.id === id ? { ...x, ...next } : x,
        ),
      }
      Object.assign(c, next)
    }
  }
  for (const id of ["db", "kv", "carts", "w", "search", "stream"]) grow(id)
  return g
}

/**
 * Scales app servers to whatever the budget allows, in front of one store:
 * the strategy demands exist to beat.
 */
export function appsOnly(w: Wave): Graph {
  const fit = Math.floor(
    (w.budget - 1_000) / CATALOGUE["app-server"].costPerInstanceMonthUsd,
  )
  return graph(
    [
      ["lb", "load-balancer", 3, 2],
      ["app", "app-server", 5, 4, Math.max(3, Math.min(60, fit)), 3],
      ["cache", "cache", 7, 3, 2, 2],
      ["db", "sql-primary", 9, 3, 2, 2],
    ],
    [`${C}>lb`, "lb>app", "app>cache", "cache>db"],
  )
}

export function naive(): Graph {
  return graph(
    [
      ["lb", "load-balancer", 2, 4],
      ["app", "app-server", 4, 4, 2, 2],
      ["db", "sql-primary", 6, 4],
    ],
    [`${C}>lb`, "lb>app", "app>db"],
  )
}
