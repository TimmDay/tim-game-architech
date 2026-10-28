import { expectedPractices, missingPractices, type Stakes } from "./practices"
import { AGGREGATORS, partitionKeyOf, shardsOf, simulate } from "./simulate"
import type {
  ComponentKind,
  Fault,
  Graph,
  LoadProfile,
  SimResult,
} from "./types"

/** "durable" means any store that keeps data: SQL, NoSQL, objects, or a specialist store. */
export type WriteSink = ComponentKind | "durable"

export const DURABLE_KINDS: ComponentKind[] = [
  "sql-primary",
  "nosql",
  "object-store",
  "time-series-db",
  "graph-db",
  "vector-db",
]

export type Targets = {
  p99Ms: number
  maxErrorRate: number
  availability: number
  budgetUsd: number
  /** Each sink must receive (nearly) every write. */
  writesReach: WriteSink[]
  /**
   * Reads no cache answers must reach one of these: a help centre's questions
   * need the {vector-db}, not a {cache} with nothing behind it.
   */
  readsReach?: ComponentKind[]
  /**
   * Groups whose records must never share a shard (each country's patients,
   * say). Every store taking writes must be split by one of `keys`, into at
   * least `minShards` shards: one per group. This checks how the data is
   * split, not where the machines physically are.
   */
  keepApart?: KeepApart
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
  /**
   * What this level doesn't need. Using it still works, but costs the third
   * star: it's more to run, pay for and keep in sync, for nothing the level
   * asks of it.
   */
  overkill?: Overkill[]
}

export type KeepApart = {
  /** Partition key ids that keep each group on shards of its own. */
  keys: string[]
  minShards: number
  /** What one shard may hold, for the sidebar: "one country's records". */
  what: string
}

/** Stores taking writes that break a level's keep-apart rule. Empty: none do. */
export function mixedStores(
  graph: Graph,
  load: LoadProfile,
  peak: SimResult,
  rule: KeepApart,
) {
  const stores = graph.components.filter(
    (c) =>
      (c.kind === "sql-primary" || c.kind === "nosql") &&
      (peak.perComponent[c.id]?.writeRps ?? 0) > 0,
  )
  if (stores.length === 0) return graph.components.slice(0, 0)
  return stores.filter((c) => {
    const key = partitionKeyOf(c, load)
    return (
      !key || !rule.keys.includes(key.id) || shardsOf(c, load) < rule.minShards
    )
  })
}

/** Something a level doesn't need: a kind of component, or a second region. */
export type Overkill = {
  kind?: ComponentKind
  regions?: true
  /** Why, in a sentence, including what it adds to run and maintain. */
  why: string
}

/** The overkill this design uses. */
export function overkillUsed(graph: Graph, list: Overkill[] = []): Overkill[] {
  const wired = (id: string) => graph.edges.some((e) => e.to === id)
  return list.filter((o) =>
    o.regions
      ? graph.components.some((c) => (c.regions ?? 1) >= 2 && wired(c.id))
      : graph.components.some((c) => c.kind === o.kind && wired(c.id)),
  )
}

/** A consistent design may refuse the minority side, never the majority. */
export const MAJORITY_SERVES = 0.5

export type Check = {
  id:
    | "traffic"
    | "latency"
    | "budget"
    | "writes"
    | "reads"
    | "once"
    | "apart"
    | "backlog"
    | "availability"
    | "chaos"
    | "practices"
    | "lean"
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
  /** Things the level doesn't need that this design uses anyway. */
  overkill: Overkill[]
}

/** Writes arriving at the best-fed component of a given sink. */
export function writesAt(
  graph: Graph,
  result: SimResult,
  sink: WriteSink,
  /** Writes a worker passes on per job: a store fed only by workers gets that share. */
  emits = 1,
) {
  const kinds = sink === "durable" ? DURABLE_KINDS : [sink]
  let best = 0
  for (const c of graph.components) {
    if (!kinds.includes(c.kind)) continue
    const into = graph.edges.filter((e) => e.to === c.id)
    const fedByWorkers =
      into.length > 0 &&
      into.every((e) => {
        const from = graph.components.find((x) => x.id === e.from)
        return from !== undefined && AGGREGATORS.has(from.kind)
      })
    // Counted as the writes it stands for, so aggregation isn't a lost write.
    const w = result.perComponent[c.id]?.writeRps ?? 0
    best = Math.max(best, fedByWorkers && emits > 0 ? w / emits : w)
  }
  return best
}

/** The level's timed work reached its destination once: not missed, not repeated. */
export function onceEach(load: LoadProfile, result: SimResult): boolean {
  const t = load.timed
  if (!t) return true
  const got = result.timed?.delivered ?? 0
  return got >= t.rps * 0.99 && got <= t.rps * 1.01
}

/** Reads arriving at the best-fed component of these kinds. */
export function readsAt(
  graph: Graph,
  result: SimResult,
  kinds: ComponentKind[],
) {
  let best = 0
  for (const c of graph.components)
    if (kinds.includes(c.kind))
      best = Math.max(best, result.perComponent[c.id]?.readRps ?? 0)
  return best
}

/** Reads no cache answered, which something behind it must. */
export function unansweredReads(load: LoadProfile, result: SimResult) {
  const typed = (load.traffic ?? [])
    .filter((t) => t.of === "reads")
    .reduce((s, t) => s + t.share, 0)
  const reads = result.offeredRps * load.readFraction * (1 - typed)
  return Math.max(0, reads - result.cacheHitRps)
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
  const allWrites = load.peakRps * (1 - load.readFraction)
  // Traffic types of writes (file chunks) belong in their own stores, so the
  // level's write sinks expect only the ordinary writes.
  const typedWrites = (load.traffic ?? []).filter((t) => t.of === "writes")
  const expectedWrites =
    allWrites * (1 - typedWrites.reduce((s, t) => s + t.share, 0))

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
  const ordinary = targets.writesReach.length > 0 && expectedWrites > 0
  // A level whose writes are all of one type (metric points) checks only those.
  if (ordinary || (typedWrites.length > 0 && allWrites > 0)) {
    checks.push({
      id: "writes",
      pass:
        (!ordinary ||
          targets.writesReach.every(
            (s) =>
              writesAt(graph, peak, s, load.job?.emits) >=
              expectedWrites * 0.99,
          )) &&
        typedWrites.every((t) =>
          t.to.some(
            (k) => writesAt(graph, peak, k) >= allWrites * t.share * 0.99,
          ),
        ),
      star: 1,
    })
  }
  if (load.timed) {
    checks.push({ id: "once", pass: onceEach(load, peak), star: 1 })
  }
  if (targets.readsReach?.length) {
    checks.push({
      id: "reads",
      pass:
        readsAt(graph, peak, targets.readsReach) >=
        unansweredReads(load, peak) * 0.99,
      star: 1,
    })
  }
  if (targets.keepApart) {
    const rule = targets.keepApart
    const wrote = graph.components.some(
      (c) =>
        (c.kind === "sql-primary" || c.kind === "nosql") &&
        (peak.perComponent[c.id]?.writeRps ?? 0) > 0,
    )
    checks.push({
      id: "apart",
      pass: wrote && mixedStores(graph, load, peak, rule).length === 0,
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
        onceEach(load, chaos) &&
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
  const overkill = overkillUsed(graph, targets.overkill)
  if (targets.overkill?.length)
    checks.push({ id: "lean", pass: overkill.length === 0, star: 3 })

  const passed = (star: number) =>
    checks.filter((c) => c.star <= star).every((c) => c.pass)
  const stars = passed(3) ? 3 : passed(2) ? 2 : passed(1) ? 1 : 0
  return { checks, stars, peak, chaos, practices, overkill }
}
