import type { ConceptId } from "~/levels/concepts"
import {
  CATALOGUE,
  inlineJobCost,
  inlineJobMs,
  SATURATION_WARN,
  workerJobsPerSecond,
} from "./catalogue"
import { behindAsync, doesHeavyWorkInline, failureDomains } from "./simulate"
import type {
  ComponentKind,
  Graph,
  LoadProfile,
  PlacedComponent,
  SimResult,
} from "./types"
import { CLIENT_ID } from "./types"

/**
 * The sandbox's load-test report. Unlike level findings, which only name
 * symptoms so the player works out the fix, this says why something broke,
 * what would fix it (with sizes and costs worked out from the engine's own
 * numbers) and what else to weigh. There's no puzzle to spoil in a sandbox.
 */
export type Advice = {
  severity: "error" | "warn"
  componentId?: string
  /** Why it happened. `{kind}` tokens, like all game text. */
  why: string
  /** What would help. */
  fix: string
  /** Anything else worth weighing before making the change. */
  consider?: string
  concept?: ConceptId
}

export type Report = {
  status: "healthy" | "strained" | "broken"
  advice: Advice[]
  /** Points about the whole design, whatever its status. */
  notes: string[]
}

/** Size tiers to run at this utilisation, leaving room for a spike. */
const AIM = 0.7

const rps = (n: number) => `${Math.round(n).toLocaleString("en-US")}/s`
const pct = (n: number) => `${Math.round(n * 100)}%`
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`
const ms = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`
const name = (k: ComponentKind) => `{${k}}`

/** Instances needed to bring this component down to AIM, by its own capacity. */
function instancesFor(c: PlacedComponent, utilization: number) {
  const units = Math.max(1, c.instances)
  return Math.ceil((units * utilization) / AIM)
}

export function report(
  graph: Graph,
  load: LoadProfile,
  result: SimResult,
): Report {
  if (!result.connected)
    return {
      status: "broken",
      advice: [
        {
          severity: "error",
          why: "Nothing is connected to your users, so no request reaches anything.",
          fix: "Tap Users, press Connect, then tap your entry point: usually a {load-balancer}, or a {cdn} for files.",
        },
      ],
      notes: [],
    }

  const asyncSet = behindAsync(graph)
  const byId = new Map(graph.components.map((c) => [c.id, c]))
  const reachable = new Set<string>()
  const walk = (id: string) => {
    for (const e of graph.edges)
      if (e.from === id && !reachable.has(e.to)) {
        reachable.add(e.to)
        walk(e.to)
      }
  }
  walk(CLIENT_ID)

  const advice: Advice[] = []
  for (const c of graph.components) {
    const spec = CATALOGUE[c.kind]
    const m = result.perComponent[c.id]
    if (!m) continue
    if (!reachable.has(c.id)) {
      advice.push({
        severity: "warn",
        componentId: c.id,
        why: `${name(c.kind)} isn't connected to anything that receives traffic, so it does nothing.`,
        fix: "Connect something to it, or remove it.",
        consider: `It still costs ${usd(spec.costPerInstanceMonthUsd * c.instances)} a month.`,
      })
      continue
    }

    const hot = m.utilization >= SATURATION_WARN
    const broken = m.utilization >= 1
    const downs = graph.edges
      .filter((e) => e.from === c.id)
      .flatMap((e) => byId.get(e.to) ?? [])
    const usage = Number.isFinite(m.utilization)
      ? pct(m.utilization)
      : "more than all"

    if (spec.readOnly && m.writeRps > 0) {
      advice.push({
        severity: "error",
        componentId: c.id,
        concept: "read-replicas",
        why: `${name(c.kind)} is receiving ${rps(m.writeRps)} writes, and a replica can't accept any.`,
        fix: "Send writes to the {sql-primary} and only reads to the replica: wire the caller to both.",
      })
    } else if (hot) {
      const severity = broken ? "error" : "warn"
      const load_ = `${rps(m.readRps)} reads and ${rps(m.writeRps)} writes`
      const why = broken
        ? `${name(c.kind)} gets ${load_}, ${usage} of what it can do, so it drops ${rps(m.droppedRps)}${m.behindAsync ? " and the backlog grows" : ""}.`
        : `${name(c.kind)} runs at ${usage} (${load_}). Past about 80%, requests queue inside it and its p99 climbs to ${ms(m.p99Ms)}.`

      if (c.kind === "sql-primary") {
        const onWrites =
          m.writeRps / spec.capacity.writeRps >=
          m.readRps / spec.capacity.readRps
        if (onWrites)
          advice.push({
            severity,
            componentId: c.id,
            concept: "partitioning",
            why: `${why} One primary manages about ${rps(spec.capacity.writeRps)} writes, and extra instances are standbys that add none.`,
            fix: "Take writes off it: put slow or bursty writes behind a {queue} drained at its pace, or move write-heavy data to a {nosql} store that partitions.",
            consider:
              "A bigger single database only buys time. Past one primary's limit, the data has to be split.",
          })
        else {
          const replicas = Math.ceil(m.readRps / spec.capacity.readRps / AIM)
          const cacheable = load.cacheableFraction > 0
          advice.push({
            severity,
            componentId: c.id,
            concept: cacheable ? "cache-aside" : "read-replicas",
            why,
            fix: cacheable
              ? `Put a {cache} between the callers and the database: about ${pct(load.cacheableFraction)} of reads here are for shared data it can answer (${usd(CATALOGUE.cache.costPerInstanceMonthUsd * 2)}/month for two nodes). Or spread reads over ${replicas} {sql-replica} instance${replicas === 1 ? "" : "s"} (${usd(replicas * CATALOGUE["sql-replica"].costPerInstanceMonthUsd)}/month).`
              : `Spread reads over ${replicas} {sql-replica} instance${replicas === 1 ? "" : "s"} (${usd(replicas * CATALOGUE["sql-replica"].costPerInstanceMonthUsd)}/month), wired from the callers alongside the primary.`,
            consider: cacheable
              ? "A cache is far cheaper per read, but serves data a little stale, and the database must survive it restarting cold."
              : "Replicas lag slightly: a user may not see their own change for a moment.",
          })
        }
      } else if (spec.scalesOut && spec.maxInstances > 1) {
        const need = instancesFor(c, m.utilization)
        const fits = need <= spec.maxInstances
        const extra = Math.max(0, need - c.instances)
        advice.push({
          severity,
          componentId: c.id,
          concept: m.behindAsync ? "backpressure" : "horizontal-scaling",
          why,
          fix: fits
            ? `Run ${need} instances (${extra > 0 ? `+${extra}, ${usd(extra * spec.costPerInstanceMonthUsd)}/month more` : "the same count"}) to bring it to about 70%.`
            : `It would need ${need} instances and tops out at ${spec.maxInstances}. Take load off it instead: a {cache} or {cdn} for repeated reads, or a {queue} for slow work.`,
          consider: m.behindAsync
            ? "It's behind a hand-off, so users don't wait on it: a short backlog in a burst is fine, as long as it drains."
            : c.kind === "app-server" || c.kind === "serverless"
              ? "Each instance holds connections to what it calls. A large fleet can run a database out of connections before its CPU."
              : undefined,
        })
      } else {
        advice.push({
          severity,
          componentId: c.id,
          concept: "finding-the-bottleneck",
          why,
          fix: `${name(c.kind)} can't take more instances here. Split the traffic: send some of it elsewhere, or put something in front that answers part of it.`,
        })
      }
    }

    if (
      !m.behindAsync &&
      load.heavyWriteFraction > 0 &&
      m.writeRps > 0 &&
      doesHeavyWorkInline(graph, c)
    ) {
      const jobs = m.writeRps * load.heavyWriteFraction
      const workers = Math.ceil(jobs / workerJobsPerSecond(load) / AIM)
      advice.push({
        severity: "error",
        componentId: c.id,
        concept: "async-processing",
        why: `${name(c.kind)} does the slow jobs (${rps(jobs)}) while users wait. Each costs ${Math.round(inlineJobCost(load))} times an ordinary request and adds about ${ms(inlineJobMs(load))}.`,
        fix: `Hand the jobs to a {queue} and run ${workers} {worker} instance${workers === 1 ? "" : "s"} (${usd(workers * CATALOGUE.worker.costPerInstanceMonthUsd)}/month) to drain it.`,
        consider:
          "Users then get 'processing' instead of the result, so the product needs a way to tell them when it's done.",
      })
    }

    if (
      !m.behindAsync &&
      !spec.managed &&
      !spec.optionalOnPath &&
      failureDomains(c) === 1
    ) {
      const zones = c.instances > 1
      advice.push({
        severity: "warn",
        componentId: c.id,
        concept: "single-point-of-failure",
        why: zones
          ? `All ${c.instances} ${name(c.kind)} instances are in one zone, so one zone outage takes them all.`
          : `${name(c.kind)} is a single instance: if it fails, everything that depends on it fails too.`,
        fix: zones
          ? "Spread them over two or three zones, and size each zone's share so the rest can carry the load."
          : `Run two instances in two zones (${usd(spec.costPerInstanceMonthUsd)}/month more).`,
        consider:
          c.kind === "sql-primary"
            ? "For a {sql-primary}, the second instance is a standby: it buys availability, not capacity."
            : undefined,
      })
    }

    if (c.kind === "data-warehouse" && !m.behindAsync && m.readRps > 0)
      advice.push({
        severity: "error",
        componentId: c.id,
        concept: "oltp-vs-olap",
        why: `${name(c.kind)} is on the synchronous path, so users wait on a system built for long analytical queries.`,
        fix: "Feed it asynchronously from an {event-stream}, and serve users from a database built for small, fast queries.",
      })

    if (c.kind === "load-balancer" || c.kind === "api-gateway") {
      const stores = downs.filter((t) => CATALOGUE[t.kind].category === "data")
      if (stores.length > 0)
        advice.push({
          severity: "error",
          componentId: c.id,
          concept: "horizontal-scaling",
          why: `${name(c.kind)} is wired straight to ${[...new Set(stores.map((s) => name(s.kind)))].join(" and ")}. It only forwards requests; it can't run queries.`,
          fix: "Put {app-server} instances between it and the data, and wire those to the stores.",
        })
    }

    if (spec.async && downs.length === 0)
      advice.push({
        severity: "error",
        componentId: c.id,
        concept: "competing-consumers",
        why: `Nothing consumes from ${name(c.kind)}, so messages pile up forever.`,
        fix: "Connect it to {worker} instances that do the work.",
      })
  }

  // The slow step, when the whole path is slow.
  if (result.p99Ms > 500) {
    let slowest: PlacedComponent | undefined
    for (const c of graph.components) {
      if (!reachable.has(c.id) || asyncSet.has(c.id)) continue
      const p = result.perComponent[c.id]?.p99Ms ?? 0
      if (!slowest || p > (result.perComponent[slowest.id]?.p99Ms ?? 0))
        slowest = c
    }
    // Already explained when the slow step is overloaded.
    const explained = advice.some(
      (a) =>
        a.componentId === slowest?.id &&
        a.concept !== "single-point-of-failure",
    )
    if (slowest && !explained)
      advice.push({
        severity: "warn",
        componentId: slowest.id,
        concept: "critical-path",
        why: `p99 is ${ms(result.p99Ms)}. The slowest step users wait on is ${name(slowest.kind)}, at ${ms(result.perComponent[slowest.id]?.p99Ms ?? 0)}.`,
        fix: "Make that step faster (more headroom, a cache in front of it) or take it off the request path behind a {queue}.",
      })
  }

  // Errors first.
  advice.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1,
  )

  const notes: string[] = []
  notes.push(
    `It costs ${usd(result.monthlyCostUsd)} a month and works out at ${(result.availability * 100).toFixed(3)}% available.`,
  )
  let weakest: { c: PlacedComponent; a: number } | undefined
  for (const c of graph.components) {
    const spec = CATALOGUE[c.kind]
    if (!reachable.has(c.id) || asyncSet.has(c.id) || spec.optionalOnPath)
      continue
    const a = 1 - Math.pow(1 - spec.baselineAvailability, failureDomains(c))
    if (!weakest || a < weakest.a) weakest = { c, a }
  }
  if (weakest && result.availability < 0.9999)
    notes.push(
      `The weakest link for availability is ${name(weakest.c.kind)}, at ${(weakest.a * 100).toFixed(2)}% on its own. Every component users depend on multiplies in.`,
    )
  if (result.backlogGrowthRps > 0.5)
    notes.push(
      `The background backlog grows by ${rps(result.backlogGrowthRps)}: users don't see errors, but the work never catches up.`,
    )
  notes.push(
    "Try the traffic slider above 1x, or a different read and write mix, to see what breaks next.",
  )

  const status =
    result.errorRate > 0.001 ||
    result.backlogGrowthRps > 0.5 ||
    advice.some((a) => a.severity === "error")
      ? "broken"
      : advice.length > 0
        ? "strained"
        : "healthy"
  return { status, advice, notes }
}
