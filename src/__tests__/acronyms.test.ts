import { describe, expect, it } from "vitest"
import { ACRONYMS, NOT_ACRONYMS, findAcronyms } from "~/acronyms"
import { DECKS } from "~/decks"
import { LEVELS } from "~/levels"
import { COMPONENT_CARDS, CONCEPTS } from "~/levels/concepts"
import { SOLUTIONS, solutionText } from "~/levels/solutions"
import { QUIZZES } from "~/quiz/questions"
import { SCHEMA } from "~/quiz/schema"

const gameText = () => {
  const t: string[] = []
  for (const l of LEVELS)
    t.push(
      l.brief,
      l.hint,
      l.tagline,
      l.chaos.label,
      l.rootCause?.explanation ?? "",
    )
  for (const c of [
    ...Object.values(CONCEPTS),
    ...Object.values(COMPONENT_CARDS),
  ])
    t.push(c.title, c.body, c.interview)
  for (const s of Object.values(SOLUTIONS)) t.push(...solutionText(s))
  for (const d of Object.values(DECKS))
    for (const c of d) t.push(c.prompt, ...c.points, c.followUp ?? "")
  for (const q of Object.values(QUIZZES))
    for (const x of q) t.push(x.prompt, x.correct, ...x.wrong, x.why)
  for (const q of Object.values(SCHEMA))
    for (const x of q) t.push(x.prompt, x.correct, ...x.wrong, x.why)
  // Component names are tokens rendered per provider; they aren't prose.
  return t.map((s) => s.replace(/\{[a-z-]+\}/g, ""))
}

describe("acronyms", () => {
  it("explains every acronym the game's text uses", () => {
    const unknown = new Set<string>()
    for (const t of gameText())
      for (const m of t.matchAll(
        /\b(?:[A-Z][A-Za-z]*[A-Z][A-Za-z0-9]*|p\d\d)\b/g,
      )) {
        const w = m[0]
        const base =
          w.endsWith("s") && ACRONYMS[w.slice(0, -1)] ? w.slice(0, -1) : w
        if (!ACRONYMS[base] && !NOT_ACRONYMS.has(w)) unknown.add(w)
      }
    expect([...unknown], "add these to ACRONYMS or NOT_ACRONYMS").toEqual([])
  })

  it("finds whole words, plurals included, and nothing inside other words", () => {
    expect(
      findAcronyms("Set a TTL on the CDN URLs").map((f) => f.term),
    ).toEqual(["TTL", "CDN", "URL"])
    expect(findAcronyms("CDNs and APIs")).toHaveLength(2)
    expect(findAcronyms("SQLite and NoSQL")).toEqual([
      { start: 11, end: 16, term: "NoSQL" },
    ])
    expect(findAcronyms("the p99 and p50")).toHaveLength(2)
    expect(findAcronyms("ideas and identity")).toEqual([])
  })

  it("spells every acronym out", () => {
    for (const [k, a] of Object.entries(ACRONYMS))
      expect(a.expansion.length, k).toBeGreaterThan(2)
  })
})
