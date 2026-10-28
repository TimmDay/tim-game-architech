import { describe, expect, it } from "vitest"
import { LEVELS, graph, levelById } from "~/levels"
import { findings } from "../findings"
import { grade } from "../grade"
import { KINDS } from "../catalogue"
import {
  expectedPractices,
  missingPractices,
  OFFERS,
  type PracticeId,
} from "../practices"
import type { Fault, Graph, Practices } from "../types"
import { CLIENT_ID } from "../types"

const level = (id: string) => {
  const l = levelById(id)
  if (!l) throw new Error(`missing ${id}`)
  return l
}
const bare = (g: Graph): Graph => ({
  ...g,
  components: g.components.map((c) => ({ ...c, practices: undefined })),
})
const set = (g: Graph, id: string, p: Practices): Graph => ({
  ...g,
  components: g.components.map((c) =>
    c.id === id ? { ...c, practices: { ...c.practices, ...p } } : c,
  ),
})
const wants = (id: string) => {
  const l = level(id)
  const stakes = l.targets.stakes
  if (!stakes) throw new Error("no stakes")
  return (componentId: string) =>
    expectedPractices(l.reference, stakes)
      .filter((x) => x.componentId === componentId)
      .map((x) => x.practice)
}

/** Faults that a production setting is what survives. */
const SETTING_FAULTS: Fault["kind"][] = [
  "slow-dependency",
  "poison-message",
  "credential-stuffing",
  "unauthenticated-probe",
  "bad-migration",
  "silent-stall",
]

describe.each(LEVELS)("$id", (l) => {
  it("has stakes, and its reference without production settings earns two stars, not three", () => {
    expect(l.targets.stakes).toBeDefined()
    const g = grade(bare(l.reference), l.load, l.targets, l.chaos.faults)
    const failed = g.checks.filter((c) => !c.pass).map((c) => c.id)
    // Where the chaos round tests a setting (all of the incidents shelf, and
    // some classics), the bare reference fails it too.
    const testsASetting =
      l.track === "ops" ||
      l.chaos.faults.some((f) => SETTING_FAULTS.includes(f.kind))
    expect(failed).toEqual(
      testsASetting ? ["chaos", "practices"] : ["practices"],
    )
    expect(g.stars).toBe(2)
  })

  it("ties every missing setting to its component, so repair mode can hold it back", () => {
    const r = grade(bare(l.reference), l.load, l.targets, l.chaos.faults)
    const f = findings(
      bare(l.reference),
      l.load,
      r.peak,
      l.targets,
      r.chaos,
      l.chaos.label,
    )
    const stakes = l.targets.stakes
    if (!stakes) return
    const n = missingPractices(bare(l.reference), stakes).length
    const tied = f.filter(
      (x) => x.concept && x.componentId && x.severity === "warn",
    )
    expect(tied.length).toBeGreaterThanOrEqual(n)
  })
})

describe("what each level expects", () => {
  it("timeouts, backoff and alerts on every request tier; backups and alerts on the system of record", () => {
    const w = wants("first-customers")
    expect(w("app")).toEqual(
      expect.arrayContaining<PracticeId>([
        "timeouts",
        "backoff",
        "alerts",
        "auth",
      ]),
    )
    expect(w("db")).toEqual(
      expect.arrayContaining<PracticeId>(["backups", "encryption", "alerts"]),
    )
  })

  it("public sites don't need sign-in, and nothing personal needs encrypting", () => {
    const l = level("going-viral")
    const stakes = l.targets.stakes
    if (!stakes) throw new Error("no stakes")
    const all = expectedPractices(l.reference, stakes).map((x) => x.practice)
    expect(all).not.toContain("auth")
    expect(all).not.toContain("encryption")
  })

  it("where money moves: point-in-time recovery and idempotency keys", () => {
    const w = wants("balance-sheet")
    expect(w("db")).toContain("point-in-time")
    expect(w("app")).toContain("idempotency")
    const l = level("balance-sheet")
    const daily = set(l.reference, "db", { backups: "daily" })
    const g = grade(daily, l.load, l.targets, l.chaos.faults)
    expect(g.stars).toBe(2)
  })

  it("immediate retries aren't backoff", () => {
    const l = level("first-customers")
    const g = set(l.reference, "app", { retries: "immediate" })
    expect(grade(g, l.load, l.targets, l.chaos.faults).stars).toBe(2)
  })

  it("every queue needs a dead-letter queue", () => {
    expect(wants("upload-rush")("q")).toContain("dlq")
  })

  it("the rate limit belongs where traffic first lands, past DNS", () => {
    const l = level("ticket-drop")
    const stakes = l.targets.stakes
    if (!stakes) throw new Error("no stakes")
    const limited = expectedPractices(l.reference, stakes)
      .filter((x) => x.practice === "rate-limit")
      .map((x) => x.componentId)
    expect(limited).toEqual(["cdn"])
  })

  it("sign-in is checked by the first code on the path, or a gateway in front of it", () => {
    const l = level("ticket-drop")
    const stakes = l.targets.stakes
    if (!stakes) throw new Error("no stakes")
    const auth = expectedPractices(l.reference, stakes)
      .filter((x) => x.practice === "auth")
      .map((x) => x.componentId)
    expect(auth).toEqual(["app"])
  })
})

describe("the sidebar offers every setting the grade asks for", () => {
  /** The setting that satisfies each expectation. */
  const KEY: Record<PracticeId, keyof Practices> = {
    backups: "backups",
    "point-in-time": "backups",
    encryption: "encrypted",
    auth: "auth",
    "rate-limit": "rateLimit",
    timeouts: "timeouts",
    backoff: "retries",
    dlq: "dlq",
    idempotency: "idempotency",
    alerts: "alerts",
  }
  const all = { signedIn: true, personalData: true, money: true, abuse: true }

  it.each(KINDS)("%s", (kind) => {
    // First in line, behind a request tier, and calling something itself.
    const designs: Graph[] = [
      graph([["x", kind, 1, 1]], [`${CLIENT_ID}>x`]),
      graph(
        [
          ["app", "app-server", 1, 1],
          ["x", kind, 2, 1],
          ["db", "sql-primary", 3, 1],
        ],
        [`${CLIENT_ID}>app`, "app>x", "x>db"],
      ),
    ]
    for (const g of designs)
      for (const x of expectedPractices(g, all).filter(
        (e) => e.componentId === "x",
      ))
        expect(OFFERS[kind] ?? [], x.practice).toContain(KEY[x.practice])
  })
})
