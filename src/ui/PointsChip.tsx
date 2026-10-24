import { Sparkles, Star } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useReview } from "~/game/points-store"
import { sfx } from "~/game/sound"

/** Total points, with a brief "+N" whenever some are earned. */
export function PointsChip() {
  const { total } = useReview()
  const prev = useRef(total)
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null)

  useEffect(() => {
    const diff = total - prev.current
    prev.current = total
    if (diff <= 0) return
    setGain({ n: diff, key: Date.now() })
    sfx.coin()
    const t = setTimeout(() => setGain(null), 1400)
    return () => clearTimeout(t)
  }, [total])

  return (
    <span
      className="relative flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-200"
      title="Points"
      aria-label={`${total} points`}
    >
      <Sparkles size={12} />
      {total.toLocaleString("en-US")}
      {gain && (
        <span
          key={gain.key}
          className="points-pop pointer-events-none absolute -top-4 right-1 text-[12px] font-bold text-amber-300"
        >
          +{gain.n}
        </span>
      )}
    </span>
  )
}

/** Stars across every level: the second tally, beside points. */
export function StarsChip({ stars }: { stars: number }) {
  return (
    <span
      className="flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-200"
      title="Stars"
      aria-label={`${stars} stars`}
    >
      <Star size={12} className="fill-amber-300 text-amber-300" />
      {stars}
    </span>
  )
}

/** Streak, stars and points in one pill: the top bar is short of room on a phone. */
export function Tally({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/[0.07] px-2.5 py-1">
      {children}
    </span>
  )
}
