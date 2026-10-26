import { Info } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

/** A small (i) beside a heading: tap it for what the screen is for. */
export function InfoTip({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  // Under the button, left edges aligned, kept inside the screen.
  const [at, setAt] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = ref.current?.getBoundingClientRect()
      const w = pop.current?.offsetWidth ?? 0
      if (r)
        setAt({
          top: r.bottom + 8,
          left: Math.max(16, Math.min(r.left - 8, window.innerWidth - w - 16)),
        })
    }
    place()
    const close = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !pop.current?.contains(t)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("pointerdown", close)
    window.addEventListener("keydown", esc)
    window.addEventListener("resize", place)
    return () => {
      window.removeEventListener("pointerdown", close)
      window.removeEventListener("keydown", esc)
      window.removeEventListener("resize", place)
    }
  }, [open])

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`About: ${title}`}
        aria-expanded={open}
        className="grid size-6 place-items-center rounded-full text-slate-500 hover:text-white"
      >
        <Info size={14} />
      </button>
      {open &&
        // On the body, so no header's stacking context can cover it.
        createPortal(
          <div
            ref={pop}
            role="dialog"
            aria-label={title}
            style={{ top: at.top, left: at.left }}
            className="pop fixed z-[80] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl shadow-black/60 backdrop-blur"
          >
            <p className="font-display text-xl font-bold text-white">{title}</p>
            <div className="mt-1 text-[14px] leading-relaxed text-slate-400">
              {children}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
