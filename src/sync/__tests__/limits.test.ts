import { describe, expect, it } from "vitest"
import { DECKS } from "~/decks"
import { ACHIEVEMENTS } from "~/game/achievements"
import { RANKS } from "~/game/ranks"
import { EMPTY, type ReviewState } from "~/game/review"
import { LEVELS } from "~/levels"
import { PROVIDERS } from "~/providers/names"
import { ESTIMATES } from "~/quiz/estimate"
import { QUIZZES } from "~/quiz/questions"
import { SCHEMA } from "~/quiz/schema"
import RULES from "../../../firestore.rules?raw"
import { toCloud, type Save } from "../save"

/** The limits `firestore.rules` puts on a save, read from the file itself. */
const cap = (field: string) => {
  const m = new RegExp(
    `${field.replaceAll(".", "\\.")}\\.size\\(\\) <= (\\d+)`,
  ).exec(RULES)
  if (!m) throw new Error(`no size limit on ${field} in firestore.rules`)
  return Number(m[1])
}

/** Years of daily puzzles a save must have room for: a record and a win a day. */
const DAILY_YEARS = 5
/** Survival waves cleared: nobody gets near this. */
const SURVIVAL_WAVES = 100
/** Firestore's limit on one document, with room to spare. */
const MAX_DOC_BYTES = 0.9 * 1024 * 1024

/** Everything a player who has done everything can have earned. */
function finished(): Save {
  const awarded: Record<string, true> = {}
  const items: ReviewState["items"] = {}
  const item = { box: 5, weak: false, last: 1.8e12, due: 1.9e12 }
  const decks: Save["decks"] = {}
  for (const [deckId, cards] of Object.entries(DECKS)) {
    decks[deckId] = {}
    for (const c of cards) {
      awarded[`flash:${c.id}`] = true
      awarded[`got:${c.id}`] = true
      awarded[`kept:card:${c.id}`] = true
      items[`card:${c.id}`] = item
      decks[deckId][c.id] = "got"
    }
  }
  for (const [levelId, qs] of Object.entries(QUIZZES))
    qs.forEach((_, i) => {
      awarded[`mc:${levelId}:${i}`] = true
      awarded[`kept:mc:${levelId}:${i}`] = true
      items[`mc:${levelId}:${i}`] = item
    })
  for (const l of LEVELS) {
    for (const k of ["pass", "ran", "hint"]) awarded[`${k}:${l.id}`] = true
    for (let n = 1; n <= 3; n++) awarded[`star:${l.id}:${n}`] = true
    awarded[`kept:level:${l.id}`] = true
    items[`level:${l.id}`] = item
  }
  for (const [levelId, qs] of Object.entries(SCHEMA))
    qs.forEach((_, i) => (awarded[`schema:${levelId}:${i}`] = true))
  for (const [levelId, cs] of Object.entries(ESTIMATES))
    cs.forEach((_, i) => (awarded[`est:${levelId}:${i}`] = true))
  for (const a of ACHIEVEMENTS) awarded[`ach:${a.id}`] = true
  for (const r of RANKS) awarded[`rank:${r.title}`] = true
  for (const p of PROVIDERS) awarded[`provider:${p.id}`] = true
  for (let n = 1; n <= SURVIVAL_WAVES; n++) awarded[`survival:${n}`] = true
  for (let d = 0; d < DAILY_YEARS * 365; d++) {
    const date = new Date(Date.UTC(2026, 9, 29) + d * 86_400_000)
      .toISOString()
      .slice(0, 10)
    awarded[`daily:${date}:3:12345`] = true
    awarded[`dailywin:${date}`] = true
  }
  const progress = Object.fromEntries(
    LEVELS.map((l) => [l.id, { stars: 3, diagnosedFirstTry: true }]),
  )
  const quizzes = Object.fromEntries(
    Object.keys(QUIZZES).map((id) => [id, { best: 10, passed: true }]),
  )
  return {
    progress,
    review: { ...EMPTY, awarded, items, retention: { "device-a": 5000 } },
    decks,
    quizzes,
  }
}

/** Firestore's documented storage size for a value. */
function bytes(v: unknown): number {
  if (v === null || typeof v === "boolean") return 1
  if (typeof v === "number") return 8
  if (typeof v === "string") return new TextEncoder().encode(v).length + 1
  if (v instanceof Date) return 8
  if (Array.isArray(v)) return v.reduce((t: number, x) => t + bytes(x), 0)
  return Object.entries(v as object).reduce(
    (t, [k, x]) => t + bytes(k) + bytes(x),
    0,
  )
}

describe("a finished player's save fits the security rules", () => {
  const save = finished()
  const doc = { ...toCloud(save), updatedAt: new Date() }

  it.each([
    ["d.progress", Object.keys(doc.progress).length],
    ["d.review.awarded", Object.keys(doc.review.awarded).length],
    ["d.review.items", Object.keys(doc.review.items).length],
    ["d.review.retention", Object.keys(doc.review.retention).length],
    ["d.decks", Object.keys(doc.decks).length],
    ["d.quizzes", Object.keys(doc.quizzes).length],
  ])("%s: %i entries", (field, n) => {
    expect(n).toBeLessThanOrEqual(cap(field))
  })

  it("stays under Firestore's document size limit, even full to every cap", () => {
    // Awards and review items padded to their caps, with keys as long as the real ones.
    const longest = Math.max(
      ...Object.keys(doc.review.awarded).map((k) => k.length),
    )
    const awarded = { ...doc.review.awarded }
    const missing = cap("d.review.awarded") - Object.keys(awarded).length
    for (let i = 0; i < missing; i++)
      awarded[`pad:${i}`.padEnd(longest, "x")] = true
    const items = { ...doc.review.items }
    const item = Object.values(items)[0]
    const more = cap("d.review.items") - Object.keys(items).length
    for (let i = 0; i < more && item; i++)
      items[`pad:${i}`.padEnd(longest, "x")] = item
    const padded = { ...doc, review: { ...doc.review, awarded, items } }
    const name = "projects/p/databases/(default)/documents/users/x/save/main"
    const size = bytes(name) + bytes(padded) + 32
    expect(size, `${Math.round(size / 1024)} KiB`).toBeLessThan(MAX_DOC_BYTES)
  })
})
