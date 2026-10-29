import { CHAOS_ERROR_BUDGET, MAJORITY_SERVES, type Targets } from "./grade"
import type { Fault, Graph, SimResult } from "./types"

/**
 * The chaos round as an incident log: what each fault did, in the order it
 * landed, and what came back when they lifted. Short lines, with `{kind}`
 * tokens like the rest of the game text, from the difference between two
 * simulate() results.
 */
export type IncidentLine = {
  /**
   * bad: it fails the round. warn: it hurts, and may still hold. good: it
   * held, or came back. info: what happened.
   */
  tone: "bad" | "warn" | "good" | "info"
  text: string
  /** The line is about one component: repair mode holds it back until diagnosis. */
  componentId?: string
}

/** Repair mode before diagnosis: what the system did, not which part did it. */
export const symptomLines = (lines: IncidentLine[]) =>
  lines.filter((l) => l.componentId === undefined)

const rps = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k/s` : `${Math.round(n)}/s`
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

/** One fault, as the line that announces it. */
export function describeFault(f: Fault): string {
  switch (f.kind) {
    case "kill-instance":
      return `One {${f.target}} instance crashes`
    case "zone-outage":
      return "Zone A loses power"
    case "region-outage":
      return "A whole region goes dark"
    case "traffic-spike":
      return `Traffic spikes to ${f.multiplier}× peak`
    case "network-split":
      return "One zone loses contact with the others"
    case "slow-dependency":
      return `Every call to {${f.target}} takes ${f.extraMs}ms longer`
    case "poison-message":
      return "A message arrives that fails every time"
    case "credential-stuffing":
      return `A flood of logins at ${f.multiplier}× normal traffic`
    case "provider-outage":
      return `The {${f.target}} provider has an outage`
    case "unauthenticated-probe":
      return "Someone calls the API without signing in"
    case "bad-migration":
      return "A bad migration corrupts the system of record"
    case "silent-stall":
      return `{${f.target}} hangs without crashing`
  }
}

/**
 * The error rate the chaos round allows: the grade's own limit. A store
 * that chooses consistency may refuse the cut-off side of a split, so long
 * as the majority is served.
 */
export const chaosErrorLimit = (targets: Targets) =>
  targets.onSplit === "consistent"
    ? MAJORITY_SERVES
    : Math.max(targets.maxErrorRate, CHAOS_ERROR_BUDGET)

/**
 * What changed from `before` to `after`. `recovering` reads the same
 * difference the other way: parts coming back, errors falling. `verdict`,
 * on the last fault, is the grade's chaos check, so the log never says
 * "held" about a round the grade fails, for a reason it has no line for.
 */
export function incidentLines(
  graph: Graph,
  before: SimResult,
  after: SimResult,
  targets: Targets,
  {
    recovering = false,
    verdict,
  }: { recovering?: boolean; verdict?: boolean } = {},
): IncidentLine[] {
  const out: IncidentLine[] = []
  for (const c of graph.components) {
    const a = before.perComponent[c.id]
    const b = after.perComponent[c.id]
    if (!a || !b) continue
    const name = `{${c.kind}}`
    if (b.aliveInstances < a.aliveInstances)
      out.push(
        b.aliveInstances === 0
          ? {
              tone: "warn",
              text: `${name} is down: all ${c.instances} gone`,
              componentId: c.id,
            }
          : {
              tone: "warn",
              text: `${name} lost ${a.aliveInstances - b.aliveInstances} of ${c.instances}`,
              componentId: c.id,
            },
      )
    const over = (m: typeof a) =>
      m.aliveInstances > 0 && !m.behindAsync && m.utilization >= 1
    if (over(b) && !over(a))
      out.push({
        tone: "warn",
        text: `${name} overloaded, dropping ${rps(b.droppedRps)}`,
        componentId: c.id,
      })
    if (recovering && b.aliveInstances > a.aliveInstances)
      out.push({ tone: "good", text: `${name} is back`, componentId: c.id })
  }

  const limit = chaosErrorLimit(targets)
  // The grade's own comparisons: at most the limit, or under half on a split.
  const overLimit = (e: number) =>
    targets.onSplit === "consistent" ? e >= limit : e > limit
  const refusing =
    targets.onSplit === "consistent" &&
    after.errorRate > targets.maxErrorRate &&
    after.errorRate < limit
  if (refusing && before.errorRate <= targets.maxErrorRate)
    out.push({
      tone: "good",
      text: `The cut-off side refuses ${pct(after.errorRate)} of requests rather than disagree`,
    })
  else if (overLimit(after.errorRate) && !overLimit(before.errorRate))
    out.push({
      tone: "bad",
      text: `Errors at ${pct(after.errorRate)}, over the ${pct(limit)} the round allows`,
    })
  if (after.backlogGrowthRps > 0.5 && before.backlogGrowthRps <= 0.5)
    out.push({
      tone: targets.noBacklog === true ? "bad" : "info",
      text: `A backlog builds by ${rps(after.backlogGrowthRps)}`,
    })
  if (after.duplicateRps > 0.5 && before.duplicateRps <= 0.5)
    out.push({
      tone: "bad",
      text: `${rps(after.duplicateRps)} of writes applied twice by retries`,
    })
  if (after.divergentRps > 0.5 && before.divergentRps <= 0.5)
    out.push({
      tone: targets.onSplit === "consistent" ? "bad" : "info",
      text: `${rps(after.divergentRps)} of writes accepted on the cut-off side`,
    })
  for (const id of after.exposed.filter((x) => !before.exposed.includes(x))) {
    const c = graph.components.find((x) => x.id === id)
    if (c)
      out.push({
        tone: "bad",
        text: `{${c.kind}} answered without a sign-in`,
        componentId: c.id,
      })
  }
  if (after.dataLossMinutes > before.dataLossMinutes)
    out.push({
      tone:
        after.dataLossMinutes <= (targets.rpoMinutes ?? Infinity)
          ? "info"
          : "bad",
      text: `The restore loses the last ${Math.round(after.dataLossMinutes)} minutes of data`,
    })

  if (recovering)
    out.push({
      tone: after.errorRate <= targets.maxErrorRate ? "good" : "bad",
      text: `All clear: errors back to ${pct(after.errorRate)}`,
    })
  else if (!out.some((l) => l.tone === "bad"))
    out.push(
      verdict === false
        ? { tone: "bad", text: "It doesn't hold: the results say why" }
        : { tone: "good", text: `Held: errors at ${pct(after.errorRate)}` },
    )
  return out
}
