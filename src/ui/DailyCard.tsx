import clsx from "clsx"
import { CalendarDays, Star } from "lucide-react"
import { useMemo } from "react"
import { dailyBest, dailyFor, type DailyBest } from "~/game/daily"
import { useReview } from "~/game/points-store"
import { DailyShare } from "./DailyShare"
import { usd } from "./format"

const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex gap-0.5" aria-label={`${n} of 3 stars`}>
    {[1, 2, 3].map((i) => (
      <Star
        key={i}
        size={14}
        className={i <= n ? "fill-amber-300 text-amber-300" : "text-slate-600"}
      />
    ))}
  </span>
)

function Best({ best, par }: { best: DailyBest; par: number }) {
  return (
    <span className="flex flex-wrap items-center gap-2 font-mono text-[13px] text-slate-200">
      <Stars n={best.stars} />
      {usd(best.cost)}/mo
      {best.stars === 3 && (
        <span
          className={clsx(
            "text-[12px]",
            best.cost < par - 1 ? "text-emerald-300" : "text-slate-400",
          )}
        >
          {best.cost < par - 1 ? "under par" : "par"} {usd(par)}
        </span>
      )}
    </span>
  )
}

/** Today's puzzle on the home page: what it is, your best, and sharing it. */
export function DailyCard({
  date,
  onPlay,
}: {
  date: string
  onPlay: () => void
}) {
  const daily = useMemo(() => dailyFor(date), [date])
  const best = dailyBest(useReview(), date)
  return (
    <section className="mt-8 rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-300/[0.07] to-transparent p-4 sm:p-5">
      <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-amber-200/90 uppercase">
        <CalendarDays size={14} /> Daily puzzle #{daily.number}
      </div>
      <h2 className="font-display mt-1 text-xl font-bold text-white">
        {daily.base.title}
      </h2>
      <p className="mt-1 text-[14px] text-amber-100/90">
        Twist: {daily.twist.label}.
      </p>
      <p className="mt-1 text-[13px] text-slate-400">
        The same puzzle for everyone today, open whatever you&apos;ve unlocked.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onPlay}
          className="rounded-xl bg-amber-300 px-4 py-2.5 text-[14px] font-bold text-slate-950"
        >
          {best ? "Play again" : "Play today's puzzle"}
        </button>
        {best && <DailyShare daily={daily} best={best} />}
        {best && <Best best={best} par={daily.par} />}
      </div>
    </section>
  )
}

/** Under a daily run's results: the day's best so far, to share. */
export function DailyResult({ date }: { date: string }) {
  const daily = useMemo(() => dailyFor(date), [date])
  const best = dailyBest(useReview(), date)
  if (!best) return null
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.05] p-3">
      <div>
        <div className="font-mono text-[11px] tracking-[0.14em] text-amber-200/90 uppercase">
          Today&apos;s best
        </div>
        <Best best={best} par={daily.par} />
      </div>
      <DailyShare daily={daily} best={best} />
    </div>
  )
}
