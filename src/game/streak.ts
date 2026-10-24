import type { ReviewState } from "./review"

/**
 * Daily streak, kept as one zero-point marker per day played ("day:<date>")
 * in the review state's awards. Awards merge as a set, so two devices'
 * days combine without any new bookkeeping.
 */
const pad = (n: number) => String(n).padStart(2, "0")

/** The player's own calendar day, not UTC: a streak follows their nights. */
export const dayKey = (d: Date) =>
  `day:${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const dayBefore = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)

/** Days in a row played, ending today (or yesterday, if today isn't yet). */
export function streak(s: ReviewState, now: Date): number {
  let d = s.awarded[dayKey(now)] ? now : dayBefore(now)
  let n = 0
  while (s.awarded[dayKey(d)]) {
    n++
    d = dayBefore(d)
  }
  return n
}

/**
 * Record today. `celebrate` is the new streak when this visit extended one
 * (the first visit of a day after playing yesterday), otherwise null.
 */
export function visit(
  s: ReviewState,
  now: Date,
): { state: ReviewState; celebrate: number | null } {
  const key = dayKey(now)
  if (s.awarded[key]) return { state: s, celebrate: null }
  const state = { ...s, awarded: { ...s.awarded, [key]: true as const } }
  const n = streak(state, now)
  return { state, celebrate: n >= 2 ? n : null }
}

export type Unit = {
  name: string
  short: string
  /** How many bytes one of it is. */
  bytes: string
}

/** A unit for every day of a streak, in decimal (SI) steps of 1,000. */
export const UNITS: Unit[] = [
  { name: "Bit", short: "bit", bytes: "⅛ byte" },
  { name: "Byte", short: "B", bytes: "1 byte" },
  { name: "Kilobyte", short: "KB", bytes: "1,000 bytes" },
  { name: "Megabyte", short: "MB", bytes: "1,000,000 bytes" },
  { name: "Gigabyte", short: "GB", bytes: "10⁹ bytes" },
  { name: "Terabyte", short: "TB", bytes: "10¹² bytes" },
  { name: "Petabyte", short: "PB", bytes: "10¹⁵ bytes" },
  { name: "Exabyte", short: "EB", bytes: "10¹⁸ bytes" },
  { name: "Zettabyte", short: "ZB", bytes: "10²¹ bytes" },
  { name: "Yottabyte", short: "YB", bytes: "10²⁴ bytes" },
  { name: "Ronnabyte", short: "RB", bytes: "10²⁷ bytes" },
  { name: "Quettabyte", short: "QB", bytes: "10³⁰ bytes" },
]

/** The units a streak of n days has climbed through, the last one its title. */
export const unitsFor = (n: number) =>
  UNITS.slice(0, Math.max(1, Math.min(n, UNITS.length)))
