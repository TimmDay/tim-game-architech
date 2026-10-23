import type { ConceptId } from "~/levels/concepts"
import { CATALOGUE, SATURATION_WARN } from "./catalogue"
import { DURABLE_KINDS, MAJORITY_SERVES, type Targets, writesAt } from "./grade"
import {
  behindAsync,
  copies,
  doesHeavyWorkInline,
  failureDomains,
  partitionKeyOf,
} from "./simulate"
import type { Graph, LoadProfile, PlacedComponent, SimResult } from "./types"
import { CLIENT_ID } from "./types"
import { missingPractices, type PracticeId } from "./practices"

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

/** Why each missing practice matters, after the component's name. */
const PRACTICE_TEXT: Record<PracticeId, [ConceptId, string]> = {
  backups: [
    "backups-and-rpo",
    "has no backups. A bad migration or a dropped table copies to every standby instantly; only a backup undoes it.",
  ],
  "point-in-time": [
    "backups-and-rpo",
    "needs point-in-time recovery. Money and bookings can't go back to last night's backup: a restore must reach the minute before the mistake.",
  ],
  encryption: [
    "encryption-at-rest",
    "isn't encrypted at rest, and it holds personal data. A leaked snapshot or disk would be readable.",
  ],
  auth: [
    "authn-authz",
    "is the first code on the request path and doesn't check who's calling. Anyone who finds the endpoint can read and write.",
  ],
  "rate-limit": [
    "rate-limiting",
    "is where traffic first lands and has no rate limit, so one attacker or runaway client can use capacity meant for everyone.",
  ],
  timeouts: [
    "timeouts-and-retries",
    "has no timeouts on its calls. One slow dependency would hold every request until it stops serving anyone.",
  ],
  backoff: [
    "timeouts-and-retries",
    "doesn't retry with backoff and jitter. Without retries a brief glitch fails users; with immediate retries a struggling dependency gets hit harder.",
  ],
  dlq: [
    "dead-letter-queue",
    "has no dead-letter queue. A message that fails every time is retried forever and holds up the work behind it.",
  ],
  idempotency: [
    "idempotency",
    "retries writes that move money without idempotency keys. A retry after a timeout could charge or book twice.",
  ],
  alerts: [
    "alerting",
    "has no alerts. If it fails or falls behind, nobody hears about it until users complain.",
  ],
}

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

    const key = partitionKeyOf(c, load)
    const shards = m.shards ?? 1
    if (key && shards > 1) {
      const hot = m.hotShardShare ?? 1 / shards
      if (hot > 1 / shards + 1e-9 && m.utilization >= SATURATION_WARN)
        out.push({
          severity: m.utilization >= 1 ? "error" : "warn",
          componentId: c.id,
          concept: "hot-keys",
          text: `${name(c)}'s busiest shard takes ${pct(hot)} of the traffic, not ${pct(1 / shards)}: split by ${key.label}, one key is far busier than the rest. More shards won't spread it.`,
        })
      if (key.scatterReads >= 0.01)
        out.push({
          severity: "warn",
          componentId: c.id,
          concept: "scatter-gather",
          text: `${pct(key.scatterReads)} of reads don't name the ${key.label}, so each one asks all ${shards} shards of ${name(c)} and waits for the slowest.`,
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

  if (targets?.stakes)
    for (const x of missingPractices(graph, targets.stakes)) {
      const c = graph.components.find((c) => c.id === x.componentId)
      if (!c) continue
      const [concept, why] = PRACTICE_TEXT[x.practice]
      out.push({
        severity: "warn",
        componentId: c.id,
        concept,
        text: `${name(c)} ${why}`,
      })
    }

  const consistent = targets?.onSplit === "consistent"
  if (chaos && chaosLabel) {
    for (const c of graph.components) {
      const m = chaos.perComponent[c.id]
      if (!m) continue
      const all = m.readRps + m.writeRps
      if ((m.refusedRps ?? 0) > 0) {
        const d = copies(c)
        if (d === 1)
          out.push({
            severity: "error",
            componentId: c.id,
            concept: "single-point-of-failure",
            text: `${chaosLabel}: ${name(c)} keeps its only copy in the zone that was cut off, so nobody else can reach it.`,
          })
        else if ((m.refusedRps ?? 0) >= all - 1e-6)
          out.push({
            severity: "error",
            componentId: c.id,
            concept: "quorum",
            text: `${chaosLabel}: ${name(c)} has ${d} copies, so neither side holds a majority, and it refuses everything until the split heals.`,
          })
        else if (!consistent)
          out.push({
            severity: "error",
            componentId: c.id,
            concept: "cap-theorem",
            text: `${chaosLabel}: ${name(c)} refuses the cut-off side's requests (${rps(m.refusedRps ?? 0)}) rather than risk two answers. That's right for some data, but here people need to keep going.`,
          })
      }
      if ((m.divergentRps ?? 0) > 0.5)
        out.push({
          severity: consistent ? "error" : "warn",
          componentId: c.id,
          concept: consistent ? "cap-theorem" : "conflict-resolution",
          text: consistent
            ? `${chaosLabel}: ${name(c)} accepts ${rps(m.divergentRps ?? 0)} writes on the cut-off side that the rest can't see. When the split heals, some of them contradict each other.`
            : `${chaosLabel}: ${name(c)} keeps accepting writes on both sides (${rps(m.divergentRps ?? 0)} on the cut-off one). They'll need merging when it heals.`,
        })
    }
    // A consistent design is meant to refuse the minority side.
    const refusingIsTheJob =
      consistent &&
      chaos.errorRate < MAJORITY_SERVES &&
      chaos.divergentRps <= 0.5
    const dead = graph.components.filter(
      (c) =>
        (chaos.perComponent[c.id]?.aliveInstances ?? 1) === 0 &&
        !CATALOGUE[c.kind].optionalOnPath,
    )
    if ((chaos.errorRate > 0.01 && !refusingIsTheJob) || dead.length > 0) {
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
