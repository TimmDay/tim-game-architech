import type { ConceptId } from "~/levels/concepts"
import { CATALOGUE, SATURATION_WARN } from "./catalogue"
import { DURABLE_KINDS, type Targets, writesAt } from "./grade"
import { behindAsync, doesHeavyWorkInline, failureDomains } from "./simulate"
import type { Graph, LoadProfile, PlacedComponent, SimResult } from "./types"
import { CLIENT_ID } from "./types"

export type Finding = {
  severity: "error" | "warn"
  /** Uses `{kind}` tokens, rendered by the provider toggle. */
  text: string
  componentId?: string
  concept?: ConceptId
}

const pct = (n: number) => `${Math.round(n * 100)}%`
const rps = (n: number) => `${Math.round(n).toLocaleString("en-US")}/s`
const name = (c: PlacedComponent) => `{${c.kind}}`
const ms = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`

/**
 * What a load test tells you, in words. Symptoms, not answers: they point at
 * the component that is struggling and the concept behind it, and leave the
 * fix to the player.
 */
export function findings(
  graph: Graph,
  load: LoadProfile,
  peak: SimResult,
  targets?: Targets,
  chaos?: SimResult,
  chaosLabel?: string,
): Finding[] {
  const out: Finding[] = []
  if (!peak.connected) {
    return [
      {
        severity: "error",
        text: "Nothing is connected to your users yet. Tap Users, then Connect, then tap the first component.",
      },
    ]
  }

  const asyncSet = behindAsync(graph)
  const reachable = new Set<string>([...asyncSet])
  const walk = (id: string) => {
    for (const e of graph.edges)
      if (e.from === id && !reachable.has(e.to)) {
        reachable.add(e.to)
        walk(e.to)
      }
  }
  walk(CLIENT_ID)

  for (const c of graph.components) {
    const spec = CATALOGUE[c.kind]
    const m = peak.perComponent[c.id]
    if (!m) continue
    if (!reachable.has(c.id)) {
      out.push({
        severity: "warn",
        componentId: c.id,
        text: `${name(c)} isn't connected to anything that receives traffic.`,
      })
      continue
    }

    if (m.utilization >= 1) {
      const onWrites =
        spec.capacity.writeRps > 0 &&
        m.writeRps / spec.capacity.writeRps >= m.readRps / spec.capacity.readRps
      if (m.behindAsync) {
        out.push({
          severity: "error",
          componentId: c.id,
          concept: "backpressure",
          text: `${name(c)} can't keep up: ${rps(m.droppedRps)} more messages arrive than it can process, so the backlog grows forever.`,
        })
      } else if (spec.readOnly && m.writeRps > 0) {
        out.push({
          severity: "error",
          componentId: c.id,
          concept: "read-replicas",
          text: `${name(c)} is receiving writes, and it can't accept any.`,
        })
      } else {
        out.push({
          severity: "error",
          componentId: c.id,
          concept:
            c.kind === "sql-primary" && !onWrites
              ? "cache-aside"
              : "finding-the-bottleneck",
          text: `${name(c)} is overloaded at ${pct(m.utilization)} of capacity (${rps(m.readRps)} reads, ${rps(m.writeRps)} writes) and is dropping ${rps(m.droppedRps)}.`,
        })
      }
    } else if (m.utilization >= SATURATION_WARN) {
      out.push({
        severity: "warn",
        componentId: c.id,
        concept: "latency-under-load",
        text: `${name(c)} is running hot at ${pct(m.utilization)}, which is pushing its p99 to ${ms(m.p99Ms)}.`,
      })
    }

    if (
      !m.behindAsync &&
      load.heavyWriteFraction > 0 &&
      m.writeRps > 0 &&
      doesHeavyWorkInline(graph, c)
    ) {
      out.push({
        severity: "error",
        componentId: c.id,
        concept: "async-processing",
        text: `${name(c)} does slow jobs while the user waits, adding about 1.8s to every write and eating its capacity.`,
      })
    }

    if (
      !m.behindAsync &&
      !spec.managed &&
      !spec.optionalOnPath &&
      failureDomains(c) === 1
    ) {
      out.push({
        severity: "warn",
        componentId: c.id,
        concept: "single-point-of-failure",
        text:
          c.instances === 1
            ? `${name(c)} is a single instance: if it dies, everything behind it goes with it.`
            : `All ${c.instances} ${name(c)} instances are in one zone. A zone outage takes them all.`,
      })
    }

    if (c.kind === "data-warehouse" && !m.behindAsync && m.readRps > 0) {
      out.push({
        severity: "error",
        componentId: c.id,
        concept: "oltp-vs-olap",
        text: `${name(c)} is on the synchronous request path. Users are waiting on an analytics system.`,
      })
    }

    // A balancer or gateway forwards requests; it can't run the queries.
    if (c.kind === "load-balancer" || c.kind === "api-gateway") {
      const stores = graph.edges
        .filter((e) => e.from === c.id)
        .flatMap((e) => graph.components.find((t) => t.id === e.to) ?? [])
        .filter((t) => CATALOGUE[t.kind].category === "data")
      if (stores.length > 0)
        out.push({
          severity: "error",
          componentId: c.id,
          concept: "horizontal-scaling",
          text: `${name(c)} is wired straight to ${[...new Set(stores.map(name))].join(" and ")}. It only forwards requests: put {app-server} instances between it and your data.`,
        })
    }

    if (spec.async && !graph.edges.some((e) => e.from === c.id)) {
      out.push({
        severity: "error",
        componentId: c.id,
        concept: "competing-consumers",
        text: `Nothing consumes from ${name(c)}. Messages pile up forever.`,
      })
    }
  }

  const expectedWrites = peak.offeredRps * (1 - load.readFraction)
  if (targets && expectedWrites > 0) {
    for (const sink of targets.writesReach) {
      const got = writesAt(graph, peak, sink)
      if (got >= expectedWrites * 0.99) continue
      const label = sink === "durable" ? "a durable store" : `{${sink}}`
      const kinds = sink === "durable" ? DURABLE_KINDS : [sink]
      const queueSplit = graph.components.some(
        (c) =>
          c.kind === "queue" &&
          graph.edges.some(
            (e) =>
              e.from === c.id &&
              kinds.includes(
                graph.components.find((t) => t.id === e.to)?.kind ?? "dns",
              ),
          ),
      )
      out.push({
        severity: "error",
        concept: queueSplit ? "queue-vs-log" : "read-replicas",
        text: `Only ${rps(got)} of ${rps(expectedWrites)} writes reach ${label}. The rest are lost.`,
      })
    }
  }

  if (targets) {
    if (peak.p99Ms > targets.p99Ms)
      out.push({
        severity: "error",
        concept: "critical-path",
        text: `p99 is ${ms(peak.p99Ms)} against a ${ms(targets.p99Ms)} target. Look for the slowest chain of synchronous calls.`,
      })
    if (peak.monthlyCostUsd > targets.budgetUsd)
      out.push({
        severity: "error",
        text: `$${Math.round(peak.monthlyCostUsd)}/month is over the $${targets.budgetUsd} budget.`,
      })
    if (peak.availability < targets.availability)
      out.push({
        severity: "warn",
        concept: "availability-math",
        text: `Availability works out at ${(peak.availability * 100).toFixed(3)}%, short of ${(targets.availability * 100).toFixed(2)}%.`,
      })
  }

  if (chaos && chaosLabel) {
    const dead = graph.components.filter(
      (c) =>
        (chaos.perComponent[c.id]?.aliveInstances ?? 1) === 0 &&
        !CATALOGUE[c.kind].optionalOnPath,
    )
    if (chaos.errorRate > 0.01 || dead.length > 0) {
      out.push({
        severity: "error",
        concept:
          dead.length > 0 ? "availability-zones" : "n-plus-one-redundancy",
        text: `${chaosLabel}: ${pct(chaos.errorRate)} of requests fail.`,
      })
      // Separate, and tied to the component, so repair mode can hold it back.
      for (const c of dead)
        out.push({
          severity: "error",
          componentId: c.id,
          concept: "single-point-of-failure",
          text: `${chaosLabel}: ${name(c)} lost every instance.`,
        })
    }
  }

  return out
}

/**
 * Repair mode before diagnosis: system-level symptoms only. Findings that
 * point at a component, or link the concept that explains it, would hand the
 * player the answer. The board's colours and per-component stats stay: those
 * are the evidence to analyse.
 */
export const symptomsOnly = (items: Finding[]): Finding[] =>
  items
    .filter((f) => f.componentId === undefined)
    .map((f) => ({ ...f, concept: undefined }))
