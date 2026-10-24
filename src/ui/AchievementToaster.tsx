import { Trophy } from "lucide-react"
import { useEffect, useState } from "react"
import { grantAchievements, type Achievement } from "~/game/achievements"
import { getReview, updateReview, useReview } from "~/game/points-store"
import { awardStars } from "~/game/review"
import { sfx } from "~/game/sound"
import { loadQuiz, type Progress } from "~/game/storage"
import { LEVELS } from "~/levels"

/**
 * Watches progress and points, grants achievements the moment they're
 * earned (including ones earned before achievements existed), and shows a
 * toast for each.
 */
export function AchievementToaster({ progress }: { progress: Progress }) {
  const review = useReview()
  const [toasts, setToasts] = useState<{ a: Achievement; key: number }[]>([])

  useEffect(() => {
    const quizzes = Object.fromEntries(
      LEVELS.map((l) => [l.id, loadQuiz(l.id)]),
    )
    // Stars pay points too; saved stars from before that catch up here.
    const best = Object.fromEntries(
      LEVELS.map((l) => [l.id, progress[l.id]?.stars ?? 0]),
    )
    const paid = awardStars(getReview(), best)
    const { state, granted } = grantAchievements(paid, {
      progress,
      quizzes,
    })
    if (state !== getReview()) updateReview(() => state)
    if (granted.length === 0) return
    sfx.fanfare()
    const now = Date.now()
    // Deferred a tick (the grant above re-renders through the store) and not
    // cancelled: that re-render re-runs this effect, which must not drop it.
    setTimeout(
      () =>
        setToasts((q) => [
          ...q,
          ...granted.map((a, i) => ({ a, key: now + i })),
        ]),
      0,
    )
  }, [progress, review])

  useEffect(() => {
    if (toasts.length === 0) return
    const t = setTimeout(() => setToasts((x) => x.slice(1)), 3800)
    return () => clearTimeout(t)
  }, [toasts])

  const top = toasts[0]
  if (!top) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4"
      style={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
      role="status"
    >
      <div
        key={top.key}
        className="pop flex items-center gap-3 rounded-2xl border border-amber-300/40 bg-slate-900/95 py-2.5 pr-4 pl-3 shadow-2xl shadow-amber-500/20"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-amber-300/15 text-amber-300">
          <Trophy size={20} />
        </span>
        <span>
          <span className="block font-mono text-[10px] tracking-[0.18em] text-amber-300/80 uppercase">
            Achievement · +20
          </span>
          <span className="font-display block text-[15px] font-bold text-white">
            {top.a.title}
          </span>
          <span className="block text-[12px] text-slate-400">
            {top.a.description}
          </span>
        </span>
      </div>
    </div>
  )
}
