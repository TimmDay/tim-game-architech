export const ms = (n: number) =>
  !Number.isFinite(n)
    ? "∞"
    : n >= 3_600_000
      ? `${Math.round(n / 3_600_000)}h`
      : n >= 60_000
        ? `${Math.round(n / 60_000)}min`
        : n >= 1000
          ? `${(n / 1000).toFixed(1)}s`
          : `${Math.round(n)}ms`

export const pct = (n: number, digits = 1) =>
  !Number.isFinite(n) ? "∞" : `${(n * 100).toFixed(digits)}%`

/** Availability needs its nines shown, not rounded away. */
export const nines = (n: number) => {
  if (n >= 0.99999) return `${(n * 100).toFixed(4)}%`
  if (n >= 0.999) return `${(n * 100).toFixed(3)}%`
  return `${(n * 100).toFixed(2)}%`
}

export const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

export const rps = (n: number) =>
  n >= 10_000
    ? `${(n / 1000).toFixed(0)}k/s`
    : n >= 1000
      ? `${(n / 1000).toFixed(1)}k/s`
      : `${Math.round(n)}/s`

/**
 * What one instance costs, for the palette and sidebar: a monthly fee, a
 * price per million requests, or both.
 */
export function priceNote(spec: {
  costPerInstanceMonthUsd: number
  costPerMillion?: { reads: number; writes: number }
  costPerMillionTokens?: { input: number; output: number }
}): string {
  const per = spec.costPerMillion
  const tok = spec.costPerMillionTokens
  const usage = tok
    ? `$${tok.input}/$${tok.output}/M tok`
    : per
      ? `$${Math.max(per.reads, per.writes).toLocaleString("en-US")}/M req`
      : ""
  if (spec.costPerInstanceMonthUsd === 0) return usage || "free"
  const fee = `${usd(spec.costPerInstanceMonthUsd)}/mo`
  return usage ? `${fee} + ${usage}` : fee
}
