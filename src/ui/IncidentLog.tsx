import clsx from "clsx"
import type { Provider } from "~/providers/names"
import type { IncidentLine } from "~/sim/incident"
import { Rich } from "./Rich"

/** A line of the incident log, stamped with seconds into the run. */
export type IncidentEntry = IncidentLine & { at: number }

const TONE: Record<IncidentLine["tone"], string> = {
  bad: "text-rose-200",
  warn: "text-amber-200",
  good: "text-emerald-200",
  info: "text-slate-100",
}
const DOT: Record<IncidentLine["tone"], string> = {
  bad: "bg-rose-400",
  warn: "bg-amber-300",
  good: "bg-emerald-300",
  info: "bg-slate-400",
}

const stamp = (s: number) => `0:${String(Math.floor(s)).padStart(2, "0")}`

export function IncidentLines({
  entries,
  provider,
}: {
  entries: IncidentEntry[]
  provider: Provider
}) {
  return (
    <ol className="space-y-1">
      {entries.map((e, i) => (
        <li
          key={i}
          className="flex items-baseline gap-2 text-[12px] leading-snug"
        >
          <span className="shrink-0 font-mono text-[11px] text-slate-500">
            {stamp(e.at)}
          </span>
          <span
            aria-hidden
            className={clsx("mt-1 size-1.5 shrink-0 rounded-full", DOT[e.tone])}
          />
          <span
            className={clsx(TONE[e.tone], e.tone === "info" && "font-semibold")}
          >
            <Rich text={e.text} provider={provider} />
          </span>
        </li>
      ))}
    </ol>
  )
}

/** The log over the board while a run plays: newest at the bottom. */
export function IncidentLog({
  entries,
  provider,
}: {
  entries: IncidentEntry[]
  provider: Provider
}) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Incident log"
      className="pointer-events-none absolute bottom-3 left-3 z-20 max-h-[45%] w-[min(22rem,calc(100%-1.5rem))] overflow-hidden rounded-xl border border-white/10 bg-slate-950/85 p-3 backdrop-blur"
    >
      <div className="mb-1.5 font-mono text-[10px] tracking-[0.18em] text-slate-400 uppercase">
        Incident log
      </div>
      <IncidentLines entries={entries.slice(-8)} provider={provider} />
    </div>
  )
}
