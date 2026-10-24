import { describe, expect, it } from "vitest"
import { LEVELS, levelById } from "~/levels"
import { findings } from "../findings"
import { grade } from "../grade"
import {
  expectedPractices,
  missingPractices,
  type PracticeId,
} from "../practices"
import type { Graph, Practices } from "../types"

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

describe.each(LEVELS)("$id", (l) => {
  it("has stakes, and its reference without production settings earns two stars, not three", () => {
    expect(l.targets.stakes).toBeDefined()
    const g = grade(bare(l.reference), l.load, l.targets, l.chaos.faults)
    const failed = g.checks.filter((c) => !c.pass).map((c) => c.id)
    // On the incidents shelf, the chaos round is what the settings are for.
    expect(failed).toEqual(
      l.track === "ops" ? ["chaos", "practices"] : ["practices"],
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
