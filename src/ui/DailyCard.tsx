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

/**
 * A desk calendar as an isometric cube, in the board's projection: the month
 * on the left face, the day on the right.
 */
function CalendarCube({ date }: { date: string }) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number]
  const month = new Date(y, m - 1, d)
    .toLocaleString("en", { month: "short" })
    .toUpperCase()
  return (
    <div className="float relative h-32 w-32 shrink-0" aria-hidden>
      <svg viewBox="0 0 120 124" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="daily-top" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="daily-left" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f8fafc" />
            <stop offset="1" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="daily-right" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2e8f0" />
            <stop offset="1" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
        <g>
          <ellipse
            cx="60"
            cy="114"
            rx="34"
            ry="7"
            fill="#f59e0b"
            opacity="0.22"
          />
          <path d="M20 36 L60 56 L60 100 L20 80 Z" fill="url(#daily-left)" />
          <path d="M60 56 L100 36 L100 80 L60 100 Z" fill="url(#daily-right)" />
          <path d="M60 16 L100 36 L60 56 L20 36 Z" fill="url(#daily-top)" />
          {/* The binding along the top edges, and two rings through it. */}
          <path d="M20 36 L60 56 L60 63 L20 43 Z" fill="#dc2626" />
          <path d="M60 56 L100 36 L100 43 L60 63 Z" fill="#b91c1c" />
          {[
            [34, 37],
            [80, 40],
          ].map(([x, ry]) => (
            <rect
              key={x}
              x={x}
              y={ry}
              width="5"
              height="12"
              rx="2.5"
              fill="#334155"
              stroke="#0f172a"
              strokeWidth="0.8"
            />
          ))}
          <g transform="matrix(1 0.5 0 1 20 36)">
            <text
              x="20"
              y="32"
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#b91c1c"
              fontFamily="var(--font-mono)"
            >
              {month}
            </text>
          </g>
          <g transform="matrix(1 -0.5 0 1 60 56)">
            <text
              x="20"
              y="36"
              textAnchor="middle"
              fontSize="24"
              fontWeight="800"
              fill="#0f172a"
              fontFamily="var(--font-display)"
            >
              {d}
            </text>
          </g>
        </g>
      </svg>
    </div>
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
    <section className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-b from-amber-300/[0.12] via-violet-500/[0.06] to-slate-950/40 p-5 text-center shadow-[0_0_40px_-12px_rgba(251,191,36,0.45)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-amber-300/20 blur-3xl"
      />
      <div className="relative flex flex-col items-center">
        <CalendarCube date={date} />
        <div className="mt-1 flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-amber-200 uppercase">
          <CalendarDays size={14} /> Daily puzzle
        </div>
        <h2 className="font-display mt-1 text-2xl font-bold text-white">
          {daily.base.title}
        </h2>
        <p className="mt-1 text-[14px] text-amber-100">
          Twist: {daily.twist.label}.
        </p>
        <p className="mt-1 text-[13px] text-slate-300">
          The same puzzle for everyone today, open whatever you&apos;ve
          unlocked.
        </p>
        {best && (
          <div className="mt-3">
            <Best best={best} par={daily.par} />
          </div>
        )}
        <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onPlay}
            className="rounded-xl bg-amber-300 px-5 py-2.5 text-[15px] font-bold text-slate-950 shadow-[0_6px_20px_-6px_rgba(251,191,36,0.7)] hover:bg-amber-200"
          >
            {best ? "Play again" : "Play today's puzzle"}
          </button>
          {best && <DailyShare daily={daily} best={best} />}
        </div>
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
