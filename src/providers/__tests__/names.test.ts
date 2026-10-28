import { describe, expect, it } from "vitest"
import { COMPONENT_CARDS, CONCEPTS } from "~/levels/concepts"
import { LEVELS } from "~/levels"
import { discuss, liveFacts } from "~/levels/roles"
import { SOLUTIONS, solutionText } from "~/levels/solutions"
import { DECKS } from "~/decks"
import { TOPICS } from "~/decks/topics"
import { QUIZZES } from "~/quiz/questions"
import { ESTIMATES } from "~/quiz/estimate"
import { DEMANDS } from "~/survival/engine"
import { SCHEMA } from "~/quiz/schema"
import { KINDS } from "~/sim/catalogue"
import { findings } from "~/sim/findings"
import { grade } from "~/sim/grade"
import { plain } from "~/text"
import { PROVIDERS, SERVICE_NAMES, type Provider } from "../names"

/** Distinctive product words: any of these in raw text is a hardcoded name. */
const productWords = (p: Provider) =>
  KINDS.flatMap((k) => {
    const own = SERVICE_NAMES[k][p]
    const generic = SERVICE_NAMES[k].generic
    return [own.short, own.name].filter(
      (w) =>
        w !== generic.short &&
        w !== generic.name &&
        !/^(API Gateway|Functions)$/.test(w),
    )
  })

const allRawText = (): string[] => {
  const out: string[] = []
  for (const l of LEVELS) {
    out.push(l.title, l.tagline, l.brief, l.hint, l.chaos.label)
    if (l.rootCause) out.push(l.rootCause.explanation)
    for (const qn of [...(QUIZZES[l.id] ?? []), ...(SCHEMA[l.id] ?? [])])
      out.push(qn.prompt, qn.correct, ...qn.wrong, qn.why)
    for (const card of DECKS[l.id] ?? [])
      out.push(card.prompt, ...card.points, card.followUp ?? "")
    for (const c of ESTIMATES[l.id] ?? [])
      if (c.kind === "mc") out.push(c.prompt, c.correct, ...c.wrong, c.why)
      else out.push(c.prompt, ...c.points, c.followUp ?? "")
    const sol = SOLUTIONS[l.id]
    if (sol) out.push(...solutionText(sol))
    for (const g of [l.reference, l.starter]) {
      if (!g) continue
      const r = grade(g, l.load, l.targets, l.chaos.faults)
      for (const f of findings(
        g,
        l.load,
        r.peak,
        l.targets,
        r.chaos,
        l.chaos.label,
        l.chaos.faults,
      ))
        out.push(f.text)
      for (const c of g.components) {
        const d = discuss(g, c.id, l.scenario, l.load)
        if (d) out.push(d.role, d.caution ?? "", ...d.tradeoffs)
        out.push(...liveFacts(g, c.id, r.peak))
      }
    }
  }
  for (const d of Object.values(DEMANDS)) out.push(d.label, d.blurb)
  for (const t of TOPICS)
    for (const card of t.cards)
      out.push(
        t.title,
        t.blurb,
        card.prompt,
        ...card.points,
        card.followUp ?? "",
      )
  for (const c of [
    ...Object.values(CONCEPTS),
    ...Object.values(COMPONENT_CARDS),
  ])
    out.push(c.title, c.body, c.interview)
  return out
}

/** Built once: it grades every level, which is too slow to repeat per provider. */
let cached: string[] | undefined
const rawText = () => (cached ??= allRawText())

describe("service names", () => {
  it("names every component under every provider", () => {
    for (const k of KINDS)
      for (const { id } of PROVIDERS) {
        expect(SERVICE_NAMES[k][id].name.trim()).not.toBe("")
        expect(SERVICE_NAMES[k][id].short.trim()).not.toBe("")
      }
  })

  it("keeps canvas labels short enough to fit under a block", () => {
    for (const k of KINDS)
      for (const { id } of PROVIDERS)
        expect(SERVICE_NAMES[k][id].short.length).toBeLessThanOrEqual(18)
  })

  it.each(["aws", "azure", "gcp"] as const)(
    "never hardcodes a %s product name in game text",
    (p) => {
      const words = productWords(p)
      const hits = rawText().flatMap((text) =>
        words.filter((w) => text.includes(w)).map((w) => `"${w}" in: ${text}`),
      )
      expect(hits).toEqual([])
    },
  )

  it("renders tokens into the chosen provider's names", () => {
    expect(plain("Put a {cache} in front", "aws")).toBe(
      "Put an ElastiCache in front",
    )
    expect(plain("Put a {cache} in front", "generic")).toBe(
      "Put a Cache in front",
    )
    expect(plain("An {queue} here", "generic")).toBe("A Queue here")
    expect(plain("{nope} stays", "gcp")).toBe("{nope} stays")
  })

  it("leaves no unrendered tokens in any game text", () => {
    const left = rawText().flatMap((text) =>
      PROVIDERS.map(({ id }) => plain(text, id)).filter((t) =>
        /\{[a-z-]+\}/.test(t),
      ),
    )
    expect(left).toEqual([])
  })
})
