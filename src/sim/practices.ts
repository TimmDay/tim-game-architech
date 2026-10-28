import { CATALOGUE } from "./catalogue"
import type { ComponentKind, Graph, PlacedComponent, Practices } from "./types"
import { CLIENT_ID } from "./types"

/**
 * What a level's system has at stake, which decides the production practices
 * it's expected to have. Timeouts, backoff, backups and alerts apply to every
 * system; the rest only where there's something to protect.
 */
export type Stakes = {
  /** People sign in, so the request tier must check who's calling. */
  signedIn: boolean
  /** It holds personal data, so stores must be encrypted at rest. */
  personalData: boolean
  /**
   * Money or bookings move, so a retried write must not apply twice and
   * backups must restore to the minute.
   */
  money: boolean
  /** Something here is worth attacking or abusing at volume (logins, sign-ups, bots). */
  abuse: boolean
}

export type PracticeId =
  | "backups"
  | "point-in-time"
  | "encryption"
  | "auth"
  | "rate-limit"
  | "timeouts"
  | "backoff"
  | "dlq"
  | "idempotency"
  | "alerts"

export type Expectation = { componentId: string; practice: PracticeId }

/** Short names, for checklists. */
export const PRACTICE_LABEL: Record<PracticeId, string> = {
  backups: "daily backups",
  "point-in-time": "point-in-time backups",
  encryption: "encrypted at rest",
  auth: "requires sign-in",
  "rate-limit": "rate limit",
  timeouts: "timeouts",
  backoff: "retries with backoff and jitter",
  dlq: "dead-letter queue",
  idempotency: "idempotency keys",
  alerts: "alerts",
}

/** Which settings each kind offers in the sidebar. */
export const OFFERS: Partial<Record<ComponentKind, (keyof Practices)[]>> = {
  cdn: ["rateLimit", "alerts"],
  "load-balancer": ["rateLimit", "alerts"],
  "api-gateway": ["auth", "rateLimit", "alerts"],
  "rate-limiter": ["rateLimit", "alerts"],
  "realtime-gateway": ["rateLimit", "alerts"],
  "app-server": [
    "auth",
    "rateLimit",
    "timeouts",
    "retries",
    "idempotency",
    "alerts",
  ],
  serverless: [
    "auth",
    "rateLimit",
    "timeouts",
    "retries",
    "idempotency",
    "alerts",
  ],
  worker: ["timeouts", "retries", "idempotency", "alerts"],
  "stream-processor": ["timeouts", "retries", "idempotency", "alerts"],
  cache: ["alerts"],
  "sql-primary": ["backups", "encrypted", "alerts"],
  "sql-replica": ["encrypted", "alerts"],
  nosql: ["backups", "encrypted", "alerts"],
  "object-store": ["backups", "encrypted", "alerts"],
  "search-index": ["encrypted", "alerts"],
  "data-warehouse": ["encrypted", "alerts"],
  queue: ["dlq", "alerts"],
  "event-stream": ["alerts"],
  pubsub: ["alerts"],
}

const REQUEST_TIERS: ComponentKind[] = ["app-server", "serverless"]
/** Stores that keep the system of record. Same list as grade's durable sink. */
const DURABLE_KINDS: ComponentKind[] = ["sql-primary", "nosql", "object-store"]
const ENCRYPTED_KINDS: ComponentKind[] = [
  "sql-primary",
  "sql-replica",
  "nosql",
  "object-store",
  "search-index",
  "data-warehouse",
]
/** Where traffic first lands, and so where a rate limit belongs. */
const ENTRY_KINDS: ComponentKind[] = [
  "cdn",
  "load-balancer",
  "api-gateway",
  "rate-limiter",
  "realtime-gateway",
  "app-server",
  "serverless",
]

/** Components reachable from the users, through any hand-off. */
function reachable(graph: Graph): Set<string> {
  const seen = new Set<string>()
  const walk = (id: string) => {
    for (const e of graph.edges)
      if (e.from === id && !seen.has(e.to)) {
        seen.add(e.to)
        walk(e.to)
      }
  }
  walk(CLIENT_ID)
  return seen
}

/**
 * Every production practice this design is expected to have, per component.
 * Derived from the wiring and the level's stakes, so a new component brings
 * its expectations with it and nobody has to list them by hand.
 */
export function expectedPractices(graph: Graph, stakes: Stakes): Expectation[] {
  const byId = new Map(graph.components.map((c) => [c.id, c]))
  const live = reachable(graph)
  const out: Expectation[] = []
  const want = (c: PlacedComponent, practice: PracticeId) =>
    out.push({ componentId: c.id, practice })
  const callsSomething = (c: PlacedComponent) =>
    graph.edges.some((e) => e.from === c.id && byId.has(e.to))

  for (const c of graph.components) {
    if (!live.has(c.id)) continue
    const kind = c.kind
    if (DURABLE_KINDS.includes(kind))
      want(c, stakes.money ? "point-in-time" : "backups")
    if (stakes.personalData && ENCRYPTED_KINDS.includes(kind))
      want(c, "encryption")
    if (kind === "queue") want(c, "dlq")
    const caller =
      REQUEST_TIERS.includes(kind) ||
      kind === "worker" ||
      kind === "stream-processor"
    if (caller && callsSomething(c)) {
      want(c, "timeouts")
      want(c, "backoff")
      if (stakes.money) want(c, "idempotency")
    }
    // Alerts where people feel a failure first, where work piles up, and on
    // the data that must not be lost.
    if (
      REQUEST_TIERS.includes(kind) ||
      CATALOGUE[kind].async ||
      DURABLE_KINDS.includes(kind)
    )
      want(c, "alerts")
  }

  if (stakes.abuse)
    for (const c of rateLimitPoints(graph)) want(c, "rate-limit")
  if (stakes.signedIn) for (const c of authPoints(graph)) want(c, "auth")
  return out
}

/**
 * On each synchronous path from the users, the first component that matches.
 * Hand-offs end a path: what's behind a queue isn't reachable from outside.
 */
function firstOnPaths(
  graph: Graph,
  pick: (c: PlacedComponent) => boolean,
): PlacedComponent[] {
  const byId = new Map(graph.components.map((c) => [c.id, c]))
  const found = new Set<string>()
  const walk = (id: string, seen: Set<string>) => {
    for (const e of graph.edges) {
      if (e.from !== id || seen.has(e.to)) continue
      const c = byId.get(e.to)
      if (!c || CATALOGUE[c.kind].async) continue
      if (pick(c)) found.add(c.id)
      else walk(c.id, new Set([...seen, c.id]))
    }
  }
  walk(CLIENT_ID, new Set())
  return [...found].flatMap((id) => byId.get(id) ?? [])
}

/** Where traffic first lands, past DNS: where a rate limit belongs. */
export const rateLimitPoints = (graph: Graph) =>
  firstOnPaths(graph, (c) => ENTRY_KINDS.includes(c.kind))

/** The first code (or gateway) on each path: where sign-in is checked. */
export const authPoints = (graph: Graph) =>
  firstOnPaths(
    graph,
    (c) => c.kind === "api-gateway" || REQUEST_TIERS.includes(c.kind),
  )

/**
 * A rate limit on servers you run yourself only holds if they share their
 * counters. Each instance otherwise counts only the requests it sees, so a
 * caller spread across them all gets that many times its limit.
 */
export function sharesCounters(graph: Graph, c: PlacedComponent): boolean {
  if (CATALOGUE[c.kind].managed || c.instances <= 1) return true
  return graph.edges.some(
    (e) =>
      e.from === c.id &&
      graph.components.find((x) => x.id === e.to)?.kind === "cache",
  )
}

/** Where a flood must be limited: per address at the edge, or per API key. */
export const floodLimitPoints = (graph: Graph, perKey = false) =>
  perKey ? authPoints(graph) : rateLimitPoints(graph)

/** How much of a flood gets through the rate limits, from 0 to 1. */
export function floodLeak(graph: Graph, perKey = false): number {
  const points = floodLimitPoints(graph, perKey)
  if (points.length === 0) return 1
  let leak = 0
  for (const c of points) {
    if (!c.practices?.rateLimit) return 1
    if (!sharesCounters(graph, c)) leak = Math.max(leak, 1 - 1 / c.instances)
  }
  return leak
}

/** Does this component have the practice it's expected to have? */
export function has(c: PlacedComponent, practice: PracticeId): boolean {
  const p = c.practices ?? {}
  switch (practice) {
    case "backups":
      return p.backups !== undefined
    case "point-in-time":
      return p.backups === "point-in-time"
    case "encryption":
      return p.encrypted === true
    case "auth":
      return p.auth === true
    case "rate-limit":
      return p.rateLimit === true
    case "timeouts":
      return p.timeouts === true
    case "backoff":
      return p.retries === "backoff"
    case "dlq":
      return p.dlq === true
    case "idempotency":
      return p.idempotency === true
    case "alerts":
      return p.alerts === true
  }
}

export function missingPractices(graph: Graph, stakes: Stakes): Expectation[] {
  const byId = new Map(graph.components.map((c) => [c.id, c]))
  return expectedPractices(graph, stakes).filter((x) => {
    const c = byId.get(x.componentId)
    return c !== undefined && !has(c, x.practice)
  })
}

/** The settings that satisfy one expectation. */
const SATISFY: Record<PracticeId, Practices> = {
  backups: { backups: "daily" },
  "point-in-time": { backups: "point-in-time" },
  encryption: { encrypted: true },
  auth: { auth: true },
  "rate-limit": { rateLimit: true },
  timeouts: { timeouts: true },
  backoff: { retries: "backoff" },
  dlq: { dlq: true },
  idempotency: { idempotency: true },
  alerts: { alerts: true },
}

/**
 * The same design with every expected practice in place. Reference solutions
 * and repair starters are built through this, so a repair level's lesson stays
 * its root cause rather than a missing checkbox.
 */
export function withPractices(graph: Graph, stakes: Stakes): Graph {
  const byId = new Map(graph.components.map((c) => [c.id, c]))
  const add = new Map<string, Practices>()
  for (const x of expectedPractices(graph, stakes)) {
    // Keep anything stronger the design already chose.
    const c = byId.get(x.componentId)
    if (c && has(c, x.practice)) continue
    add.set(x.componentId, {
      ...add.get(x.componentId),
      ...SATISFY[x.practice],
    })
  }
  return {
    ...graph,
    components: graph.components.map((c) => {
      const p = add.get(c.id)
      return p ? { ...c, practices: { ...c.practices, ...p } } : c
    }),
  }
}
