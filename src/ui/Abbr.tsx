import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { ACRONYMS } from "~/acronyms"

/**
 * An acronym with a small asterisk. Tap, click, hover or focus it to see it
 * spelled out.
 *
 * Rendered as a span with a button role rather than a <button>, because it
 * often sits inside something clickable (a flip card), and must neither flip
 * the card nor be an invalid nested button.
 */
export function Abbr({
  term,
  children,
}: {
  term: string
  children: React.ReactNode
}) {
  const a = ACRONYMS[term]
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()
  const tip = useRef<HTMLSpanElement>(null)
  const [nudge, setNudge] = useState(0)

  // Keep the popover on screen: near the edge of a phone, centring it over
  // the word would push it off the side.
  const show = open || pinned
  useLayoutEffect(() => {
    const el = tip.current
    if (!show || !el) return
    el.style.marginLeft = "0px"
    const r = el.getBoundingClientRect()
    const margin = 8
    setNudge(
      r.right > window.innerWidth - margin
        ? window.innerWidth - margin - r.right
        : r.left < margin
          ? margin - r.left
          : 0,
    )
  }, [show])

  useEffect(() => {
    if (!pinned) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setPinned(false)
        setOpen(false)
      }
    }
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [pinned])

  if (!a) return <>{children}</>
  // A tap pins it open (phones have no hover); another tap closes it.
  const toggle = () => {
    const next = !pinned
    setPinned(next)
    setOpen(next)
  }
  return (
    <span
      ref={ref}
      className="relative inline whitespace-nowrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => !pinned && setOpen(false)}
    >
      {children}
      <span
        role="button"
        tabIndex={0}
        aria-label={`${term}: ${a.expansion}`}
        aria-expanded={show}
        aria-describedby={show ? id : undefined}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          toggle()
        }}
        onKeyDown={(e) => {
          // Keep keys here: the deck flips cards on Space and Enter.
          e.stopPropagation()
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            toggle()
          } else if (e.key === "Escape") {
            setPinned(false)
            setOpen(false)
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => !pinned && setOpen(false)}
        className="ml-px cursor-help align-super text-[0.7em] font-bold text-cyan-300 hover:text-cyan-100 focus:outline-none focus-visible:rounded focus-visible:ring-1 focus-visible:ring-cyan-300"
      >
        *
      </span>
      {show && (
        <span
          id={id}
          ref={tip}
          role="tooltip"
          style={{ marginLeft: nudge }}
          className="pop absolute bottom-full left-1/2 z-[90] mb-1.5 block w-max max-w-[16rem] -translate-x-1/2 rounded-lg border border-cyan-300/30 bg-slate-900/95 px-2.5 py-1.5 text-left text-[12px] leading-snug font-normal whitespace-normal text-slate-200 shadow-xl shadow-black/50 backdrop-blur"
        >
          <span className="block font-semibold text-cyan-200">
            {term}: {a.expansion}
          </span>
          {a.note && <span className="block text-slate-400">{a.note}</span>}
        </span>
      )}
    </span>
  )
}
