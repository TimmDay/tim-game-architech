import clsx from "clsx"
import {
  Brain,
  Crown,
  Globe,
  GraduationCap,
  Layers,
  PiggyBank,
  Search,
  Shield,
  Star,
  Stars,
  Swords,
  Target,
  Trophy,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { ACHIEVEMENTS, rank, type Achievement } from "~/game/achievements"
import { useReview } from "~/game/points-store"

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
}

/** Rank, progress to the next one, and every achievement, earned or not. */
export function TrophyRoom() {
  const s = useReview()
  const r = rank(s.total)
  const earned = ACHIEVEMENTS.filter((a) => s.awarded[`ach:${a.id}`]).length
  return (
    <section className="mt-12">
      <h2 className="font-display flex items-center gap-2 text-2xl font-bold text-amber-200">
        <Trophy size={22} /> Trophy room
      </h2>
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
            {s.total.toLocaleString("en-US")} points
            {r.next &&
              ` · ${(r.next.at - s.total).toLocaleString("en-US")} to ${r.next.title}`}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
            style={{ width: `${Math.round(r.progress * 100)}%` }}
          />
        </div>
      </div>
      <p className="mt-4 mb-2 font-mono text-[11px] text-slate-500">
        {earned} of {ACHIEVEMENTS.length} achievements · 20 points each
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
