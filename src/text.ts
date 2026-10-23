import { KINDS } from "~/sim/catalogue"
import type { ComponentKind } from "~/sim/types"
import { serviceName, type Provider } from "~/providers/names"

const TOKEN = /\{([a-z-]+)\}/g
const isKind = (s: string): s is ComponentKind =>
  (KINDS as string[]).includes(s)

export type Segment = { text: string; kind?: ComponentKind }

/** Split text into plain runs and component names, so the UI can style names. */
export function segments(text: string, provider: Provider): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    const token = m[1] ?? ""
    if (!isKind(token)) continue
    const name = serviceName(token, provider).short
    let before = text.slice(last, m.index)
    // "a {cache}" has to read "an ElastiCache" under AWS and "a Cache" under none.
    before = before.replace(/\b([Aa])n? $/, (_, a: string) =>
      /^[AEIOU]/i.test(name) ? `${a}n ` : `${a} `,
    )
    if (before) out.push({ text: before })
    out.push({ text: name, kind: token })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

export const plain = (text: string, provider: Provider) =>
  segments(text, provider)
    .map((s) => s.text)
    .join("")
