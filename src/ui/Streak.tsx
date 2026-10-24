import {
  ArrowRight,
  Binary,
  Disc3,
  Earth,
  FileText,
  Flame,
  Galaxy,
  HardDrive,
  Orbit,
  Save,
  Server,
  Sparkles,
  Warehouse,
  type LucideIcon,
} from "lucide-react"
import { Fragment, useEffect, useState } from "react"
import { getReview, updateReview, useReview } from "~/game/points-store"
import { sfx } from "~/game/sound"
import { UNITS, streak, unitsFor, visit, type Unit } from "~/game/streak"
import { Confetti } from "./Confetti"
import { Modal } from "./Modal"

/** One bit: a single cell holding a 1. */
const BitSketch: LucideIcon = (({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    className={className}
  >
    <rect x="7" y="5" width="10" height="14" rx="2" />
    <path d="M11 9.5l1.5-1.2V16" strokeLinecap="round" />
  </svg>
)) as LucideIcon

/** A small drawing for each unit, from one cell up to the universe. */
const SKETCHES: Record<string, LucideIcon> = {
  bit: BitSketch,
  B: Binary,
  KB: FileText,
  MB: Save,
  GB: Disc3,
  TB: HardDrive,
  PB: Server,
  EB: Warehouse,
  ZB: Earth,
  YB: Orbit,
  RB: Galaxy,
  QB: Sparkles,
}

/** Days in a row, in the top bar beside stars and points. */
export function StreakChip() {
  const s = useReview()
  const n = streak(s, new Date())
  return (
    <span
      className="flex items-center gap-1 font-mono text-[11px] font-semibold text-orange-200"
      title={`${n}-day streak`}
      aria-label={`${n}-day streak`}
    >
      <Flame size={12} className="text-orange-300" />
      {n}
    </span>
  )
}

function UnitStep({ unit, current }: { unit: Unit; current: boolean }) {
  const Icon = SKETCHES[unit.short] ?? Sparkles
  return (
    <div className="flex w-[4.5rem] flex-col items-center text-center">
      <span
        className={
          current
            ? "grid size-11 place-items-center rounded-xl bg-orange-300/20 text-orange-200 ring-1 ring-orange-300/60"
            : "grid size-11 place-items-center rounded-xl bg-white/5 text-slate-300"
        }
      >
        <Icon size={22} />
      </span>
      <span
        className={
          current
            ? "mt-1 text-[12px] font-bold text-orange-100"
            : "mt-1 text-[12px] font-semibold text-slate-200"
        }
      >
        {unit.short}
      </span>
      <span className="font-mono text-[10px] leading-tight text-slate-500">
        ({unit.bytes})
      </span>
    </div>
  )
}

/**
 * Marks today as played whenever the app is opened or comes back into view,
 * and celebrates the first visit of a day that extends a streak.
 */
export function StreakCelebration() {
  const [days, setDays] = useState<number | null>(null)

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return
      const { state, celebrate } = visit(getReview(), new Date())
      if (state === getReview()) return
      updateReview(() => state)
      if (celebrate) {
        setDays(celebrate)
        sfx.fanfare()
      }
    }
    check()
    document.addEventListener("visibilitychange", check)
    return () => document.removeEventListener("visibilitychange", check)
  }, [])

  if (days === null) return null
  const units = unitsFor(days)
  const top = units[units.length - 1]
  const next = UNITS[units.length]
  return (
    <>
      <Confetti />
      <Modal onClose={() => setDays(null)} wide>
        <div className="text-center">
          <p className="font-display text-3xl font-bold text-white">
            {top?.name}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 font-mono text-[13px] font-bold tracking-[0.25em] text-orange-300">
            <Flame size={15} /> {days} DAY STREAK
          </p>
          <div className="mt-5 flex flex-wrap items-start justify-center gap-y-3">
            {units.map((u, i) => (
              <Fragment key={u.short}>
                {i > 0 && (
                  <ArrowRight
                    size={14}
                    className="mt-3.5 shrink-0 text-slate-600"
                    aria-hidden
                  />
                )}
                <UnitStep unit={u} current={i === units.length - 1} />
              </Fragment>
            ))}
          </div>
          <p className="mt-5 text-[13px] text-slate-400">
            {next
              ? `Come back tomorrow for a ${next.name.toLowerCase()}.`
              : "That's the biggest unit there is. Keep it going."}
          </p>
          <button
            type="button"
            onClick={() => setDays(null)}
            className="mt-4 w-full rounded-xl bg-orange-300 py-2.5 text-[14px] font-bold text-slate-950"
          >
            Keep building
          </button>
        </div>
      </Modal>
    </>
  )
}
