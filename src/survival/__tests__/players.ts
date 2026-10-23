import { graph } from "~/levels"
import { CLIENT_ID as C } from "~/sim/types"
import type { Graph } from "~/sim/types"
import { CACHE_HIT_EFFICIENCY } from "~/sim/simulate"
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
  const edgeHits = reads * cacheableFraction * CACHE_HIT_EFFICIENCY
  // Size for the worst incident: 1.5x traffic, or a zone of three gone.
  const appLoad = (peakRps - edgeHits) * 1.5
  const apps = Math.min(
    20,
    Math.max(3, Math.ceil((appLoad / 400 / 0.85) * 1.5)),
  )
  const rows: Parameters<typeof graph>[0] = [
    ["dns", "dns", 1, 4],
    ["cdn", "cdn", 2, 3],
    ["lb", "load-balancer", 3, 2],
    ["app", "app-server", 5, 4, apps, 3],
    ["cache", "cache", 7, 3, 2, 2],
  ]
  const edges = [`${C}>dns`, "dns>cdn", "cdn>lb", "lb>app", "app>cache"]
  if (writes * 1.5 > 400) {
    rows.push([
      "kv",
      "nosql",
      9,
      3,
      Math.max(1, Math.ceil((writes * 1.5) / 2500 / 0.8)),
    ])
    edges.push("cache>kv")
  } else {
    rows.push(["db", "sql-primary", 9, 3, 2, 2])
    edges.push("cache>db")
  }
  if (heavyWriteFraction > 0) {
    const jobs = writes * heavyWriteFraction * 1.5
    rows.push(
      ["q", "queue", 6, 7],
      ["w", "worker", 8, 7, Math.min(20, Math.ceil(jobs / 50 / 0.85) + 1), 3],
      ["blobs", "object-store", 10, 7],
    )
    edges.push("app>q", "q>w", "w>blobs")
  }
  return graph(rows, edges)
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
