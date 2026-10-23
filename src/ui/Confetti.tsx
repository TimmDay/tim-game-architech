import { useState } from "react"

const COLORS = [
  "#67e8f9",
  "#c084fc",
  "#fbbf24",
  "#34d399",
  "#f472b6",
  "#60a5fa",
]

/** A one-shot burst of falling confetti. Hidden under reduced motion by CSS. */
export function Confetti({ count = 90 }: { count?: number }) {
  // Random once per burst: a lazy initial state, not a render-time computation.
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      dx: `${(Math.random() - 0.5) * 30}vw`,
      spin: `${(Math.random() - 0.5) * 1440}deg`,
      dur: `${1.8 + Math.random() * 1.6}s`,
      delay: `${Math.random() * 0.4}s`,
      color: COLORS[i % COLORS.length],
      round: Math.random() < 0.3,
    })),
  )
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              borderRadius: p.round ? "50%" : undefined,
              "--dx": p.dx,
              "--spin": p.spin,
              "--dur": p.dur,
              "--delay": p.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
