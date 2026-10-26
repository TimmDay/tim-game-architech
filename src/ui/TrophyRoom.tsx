import clsx from "clsx"
import {
  Brain,
  Calculator,
  ChevronDown,
  Crown,
  Database,
  Globe,
  GraduationCap,
  Layers,
  Moon,
  PiggyBank,
  Plane,
  Search,
  Shield,
  Siren,
  Sparkles,
  Star,
  Stars,
  Swords,
  Target,
  Telescope,
  Trophy,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_POINTS,
  MAX_STARS,
  RANKS,
  completion,
  rank,
  starCount,
  type Achievement,
} from "~/game/achievements"
import { useReview } from "~/game/points-store"
import type { Progress } from "~/game/storage"

const ICONS: Record<Achievement["icon"], LucideIcon> = {
  Star,
  Stars,
  Crown,
  PiggyBank,
  Search,
  Wrench,
  GraduationCap,
  Target,
  Layers,
  Swords,
  Shield,
  Brain,
  Globe,
  Sparkles,
  Telescope,
  Siren,
  Database,
  Moon,
  Plane,
  Calculator,
}

/** Rank, progress to the next one, and every achievement, earned or not. */
export function TrophyRoom({ progress }: { progress: Progress }) {
  const s = useReview()
  const r = rank(s, progress)
  const done = completion(s, progress)
  const earned = ACHIEVEMENTS.filter((a) => s.awarded[`ach:${a.id}`]).length
  const [open, setOpen] = useState(false)
  const [ranksOpen, setRanksOpen] = useState(false)
  const got = ACHIEVEMENTS.filter((a) => s.awarded[`ach:${a.id}`])
  // Ranks are climbed in order, so every one before the current is passed.
  const passed = RANKS.slice(
    0,
    Math.max(
      0,
      RANKS.findIndex((x) => x.title === r.title),
    ),
  )
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="font-display flex items-center gap-2 text-2xl font-bold text-amber-200">
          <Trophy size={22} /> Trophy room
        </h2>
        {got.length > 0 && (
          <ul
            className="flex flex-wrap gap-1"
            aria-label={`${got.length} achievements earned`}
          >
            {got.map((a) => {
              const Icon = ICONS[a.icon]
              return (
                <li
                  key={a.id}
                  title={a.title}
                  className="grid size-7 place-items-center rounded-lg border border-amber-300/30 bg-amber-300/[0.08] text-amber-300"
                >
                  <Icon size={15} aria-label={a.title} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="mt-4 rounded-2xl border border-amber-300/20 bg-gradient-to-r from-amber-300/[0.07] to-transparent p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-amber-300/80 uppercase">
              Rank
            </p>
            <p className="font-display text-2xl font-bold text-white">
              {r.title}
            </p>
          </div>
          <p className="font-mono text-[12px] text-slate-400">
            {s.total.toLocaleString("en-US")} points · {starCount(progress)} of{" "}
            {MAX_STARS} stars · {Math.round(done.value * 100)}% of the game
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
            style={{ width: `${Math.round(r.progress * 100)}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
          {r.next ? (
            <p className="text-[12px] text-slate-400">
              Next: <b className="text-amber-100">{r.next.title}</b>. Needs{" "}
              {r.needs.join(" and ")}.
            </p>
          ) : (
            <span />
          )}
          {passed.length > 0 && (
            <div className="ml-auto text-right">
              <button
                type="button"
                onClick={() => setRanksOpen((o) => !o)}
                aria-expanded={ranksOpen}
                aria-controls="previous-ranks"
                className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:text-white"
              >
                Previous ranks
                <ChevronDown
                  size={12}
                  className={clsx(
                    "transition-transform",
                    ranksOpen && "rotate-180",
                  )}
                />
              </button>
              <ol
                id="previous-ranks"
                hidden={!ranksOpen}
                className="mt-1 space-y-0.5 text-[12px] text-slate-400"
              >
                {passed.map((x) => (
                  <li key={x.title}>{x.title}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="achievements"
        className="mt-4 mb-2 flex items-center gap-1.5 font-mono text-[11px] text-slate-500 hover:text-white"
      >
        {earned} of {ACHIEVEMENTS.length} achievements · {ACHIEVEMENT_POINTS}{" "}
        points each
        <ChevronDown
          size={13}
          className={clsx("transition-transform", open && "rotate-180")}
        />
      </button>
      <div
        id="achievements"
        hidden={!open}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        {ACHIEVEMENTS.map((a) => {
          const got = s.awarded[`ach:${a.id}`]
          const Icon = ICONS[a.icon]
          return (
            <div
              key={a.id}
              className={clsx(
                "rounded-xl border p-3",
                got
                  ? "border-amber-300/30 bg-amber-300/[0.06]"
                  : "border-white/5 bg-white/[0.02] opacity-55",
              )}
            >
              <Icon
                size={18}
                className={got ? "text-amber-300" : "text-slate-600"}
              />
              <p className="mt-1.5 text-[13px] font-semibold text-slate-100">
                {a.title}
              </p>
              <p className="text-[11px] leading-snug text-slate-400">
                {a.description}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
