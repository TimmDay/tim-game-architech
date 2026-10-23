import { findAcronyms } from "~/acronyms"
import type { Provider } from "~/providers/names"
import { CATALOGUE } from "~/sim/catalogue"
import { segments } from "~/text"
import { Abbr } from "./Abbr"
import { CATEGORY_HUE } from "./iso"

/**
 * Game text with `{kind}` tokens rendered as the current provider's names,
 * and acronyms marked with a hint (first time each appears in this text, so
 * a paragraph doesn't fill with asterisks).
 */
export function Rich({ text, provider }: { text: string; provider: Provider }) {
  const seen = new Set<string>()
  return (
    <>
      {segments(text, provider).map((s, i) =>
        s.kind ? (
          <span
            key={i}
            className="font-semibold"
            style={{
              color: `hsl(${CATEGORY_HUE[CATALOGUE[s.kind].category]} 95% 72%)`,
            }}
          >
            {s.text}
          </span>
        ) : (
          <span key={i}>{withHints(s.text, seen)}</span>
        ),
      )}
    </>
  )
}

function withHints(text: string, seen: Set<string>): React.ReactNode {
  const found = findAcronyms(text).filter((f) => {
    if (seen.has(f.term)) return false
    seen.add(f.term)
    return true
  })
  if (found.length === 0) return text
  const out: React.ReactNode[] = []
  let last = 0
  for (const f of found) {
    if (f.start > last) out.push(text.slice(last, f.start))
    out.push(
      <Abbr key={f.start} term={f.term}>
        {text.slice(f.start, f.end)}
      </Abbr>,
    )
    last = f.end
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
