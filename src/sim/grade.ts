import { expectedPractices, missingPractices, type Stakes } from "./practices"
import { simulate } from "./simulate"
import type {
  ComponentKind,
  Fault,
  Graph,
  LoadProfile,
  SimResult,
} from "./types"

/** "durable" means any store that keeps data: a SQL primary, NoSQL or objects. */
export type WriteSink = ComponentKind | "durable"

export const DURABLE_KINDS: ComponentKind[] = [
  "sql-primary",
  "nosql",
  "object-store",
]

export type Targets = {
  p99Ms: number
  maxErrorRate: number
  availability: number
  budgetUsd: number
  /** Each sink must receive (nearly) every write. */
  writesReach: WriteSink[]
  /**
   * Async consumers must keep up with what's produced. "peak": at the normal
   * peak, but a burst may queue up during the chaos round and drain later.
   */
  noBacklog: boolean | "peak"
  /**
   * What a network split must not break. "consistent": no side accepts a
   * write the other can't see, and the majority side keeps serving. Refusing
   * the minority is the correct behaviour, not a failure. "available": every
   * user keeps being served, and the copies are reconciled afterwards.
   */
  onSplit?: "consistent" | "available"
  /**
   * What the system has at stake, which decides the production practices it
   * needs for the third star. Absent (sandbox, tests), nothing is checked.
   */
  stakes?: Stakes
  /**
   * How much recent data a restore may lose, in minutes. Checked when the
   * chaos round is a bad migration.
   */
  rpoMinutes?: number
}

/** A consistent design may refuse the minority side, never the majority. */
export const MAJORITY_SERVES = 0.5

export type Check = {
  id:
    | "traffic"
    | "latency"
    | "budget"
    | "writes"
    | "backlog"
    | "availability"
    | "chaos"
    | "practices"
  pass: boolean
  /** Which star this check belongs to. */
  star: 1 | 2 | 3
}

export type Grade = {
  checks: Check[]
  stars: 0 | 1 | 2 | 3
  peak: SimResult
  chaos: SimResult
  /** Production settings the stakes call for, and how many are missing. */
  practices: { expected: number; missing: number }
}

/** Writes arriving at the best-fed component of a given sink. */
export function writesAt(graph: Graph, result: SimResult, sink: WriteSink) {
  const kinds = sink === "durable" ? DURABLE_KINDS : [sink]
  let best = 0
  for (const c of graph.components) {
    if (!kinds.includes(c.kind)) continue
    best = Math.max(best, result.perComponent[c.id]?.writeRps ?? 0)
  }
  return best
}

/** Errors under chaos get a little slack: degraded is fine, down is not. */
export const CHAOS_ERROR_BUDGET = 0.01

export function grade(
  graph: Graph,
  load: LoadProfile,
  targets: Targets,
  chaosFaults: Fault[],
): Grade {
  const peak = simulate(graph, load)
  const chaos = simulate(graph, load, chaosFaults)
  const expectedWrites = load.peakRps * (1 - load.readFraction)

  const checks: Check[] = [
    {
      id: "traffic",
      pass: peak.connected && peak.errorRate <= targets.maxErrorRate,
      star: 1,
    },
    {
      id: "latency",
      pass: peak.connected && peak.p99Ms <= targets.p99Ms,
      star: 1,
    },
    { id: "budget", pass: peak.monthlyCostUsd <= targets.budgetUsd, star: 1 },
  ]
  if (targets.writesReach.length > 0 && expectedWrites > 0) {
    checks.push({
      id: "writes",
      pass: targets.writesReach.every(
        (s) => writesAt(graph, peak, s) >= expectedWrites * 0.99,
      ),
      star: 1,
    })
  }
  if (targets.noBacklog) {
    checks.push({ id: "backlog", pass: peak.backlogGrowthRps <= 0.5, star: 1 })
  }
  checks.push(
    {
      id: "availability",
      pass: peak.availability >= targets.availability,
      star: 2,
    },
    {
      id: "chaos",
      pass:
        chaos.connected &&
        (targets.onSplit === "consistent"
          ? chaos.divergentRps <= 0.5 && chaos.errorRate < MAJORITY_SERVES
          : chaos.errorRate <=
            Math.max(targets.maxErrorRate, CHAOS_ERROR_BUDGET)) &&
        (targets.noBacklog !== true || chaos.backlogGrowthRps <= 0.5) &&
        chaos.duplicateRps <= 0.5 &&
        chaos.exposed.length === 0 &&
        chaos.dataLossMinutes <= (targets.rpoMinutes ?? Infinity),
      star: 3,
    },
  )
  const practices = targets.stakes
    ? {
        expected: expectedPractices(graph, targets.stakes).length,
        missing: missingPractices(graph, targets.stakes).length,
      }
    : { expected: 0, missing: 0 }
  if (targets.stakes)
    checks.push({ id: "practices", pass: practices.missing === 0, star: 3 })

  const passed = (star: number) =>
    checks.filter((c) => c.star <= star).every((c) => c.pass)
  const stars = passed(3) ? 3 : passed(2) ? 2 : passed(1) ? 1 : 0
  return { checks, stars, peak, chaos, practices }
}
