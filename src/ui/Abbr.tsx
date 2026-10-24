import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { ACRONYMS } from "~/acronyms"

/** Gap between the word and its popover, and the popover and the screen edge. */
const GAP = 6
const MARGIN = 8

/**
 * Inside a scope (a modal, say), only the first mention of each acronym gets
 * an asterisk: the rest render as plain text. Claims are made in render
 * order, which is document order. Outside a scope, every mention is marked
 * (Rich still marks only the first within one piece of text).
 */
const Scope = createContext<Map<string, string> | null>(null)

export function AcronymScope({ children }: { children: React.ReactNode }) {
  const [claims] = useState(() => new Map<string, string>())
  return <Scope.Provider value={claims}>{children}</Scope.Provider>
}

/**
 * An acronym with a small asterisk. Tap, click, hover or focus it to see it
 * spelled out.
 *
 * Rendered as a span with a button role rather than a <button>, because it
 * often sits inside something clickable (a flip card), and must neither flip
 * the card nor be an invalid nested button.
 *
 * The popover is portalled to the body with fixed positioning: inside a modal
 * or a scrolling panel, an absolutely positioned one gets clipped.
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
  const tip = useRef<HTMLSpanElement>(null)
  const id = useId()
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const show = open || pinned

  // Above the word if it fits, otherwise below; always inside the screen.
  useLayoutEffect(() => {
    if (!show) return
    const place = () => {
      const anchor = ref.current?.getBoundingClientRect()
      const el = tip.current
      if (!anchor || !el) return
      const { width, height } = el.getBoundingClientRect()
      const centre = anchor.left + anchor.width / 2
      const left = Math.min(
        Math.max(MARGIN, centre - width / 2),
        window.innerWidth - MARGIN - width,
      )
      const above = anchor.top - GAP - height
      const top = above >= MARGIN ? above : anchor.bottom + GAP
      setPos({ left, top })
    }
    place()
    window.addEventListener("scroll", place, true)
    window.addEventListener("resize", place)
    return () => {
      window.removeEventListener("scroll", place, true)
      window.removeEventListener("resize", place)
    }
  }, [show])

  useEffect(() => {
    if (!pinned) return
    const close = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !tip.current?.contains(t)) {
        setPinned(false)
        setOpen(false)
      }
    }
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [pinned])

  const scope = useContext(Scope)
  if (scope && !scope.has(term)) scope.set(term, id)
  if (!a || (scope && scope.get(term) !== id)) return <>{children}</>
  // A tap pins it open (phones have no hover); another tap closes it.
  const toggle = () => {
    const next = !pinned
    setPinned(next)
    setOpen(next)
  }
  const hide = () => {
    if (pinned) return
    setOpen(false)
    setPos(null)
  }
  return (
    <span
      ref={ref}
      className="inline whitespace-nowrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={hide}
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
        onBlur={hide}
        className="ml-px cursor-help align-super text-[0.7em] font-bold text-cyan-300 hover:text-cyan-100 focus:outline-none focus-visible:rounded focus-visible:ring-1 focus-visible:ring-cyan-300"
      >
        *
      </span>
      {show &&
        createPortal(
          <span
            id={id}
            ref={tip}
            role="tooltip"
            // Measured hidden on the first frame, then placed.
            style={{
              left: pos?.left ?? 0,
              top: pos?.top ?? 0,
              visibility: pos ? "visible" : "hidden",
            }}
            className="pop fixed z-[200] block w-max max-w-[min(16rem,calc(100vw-16px))] rounded-lg border border-cyan-300/30 bg-slate-900/95 px-2.5 py-1.5 text-left text-[12px] leading-snug font-normal whitespace-normal text-slate-200 shadow-xl shadow-black/50 backdrop-blur"
          >
            <span className="block font-semibold text-cyan-200">
              {term}: {a.expansion}
            </span>
            {a.note && <span className="block text-slate-400">{a.note}</span>}
          </span>,
          document.body,
        )}
    </span>
  )
}
