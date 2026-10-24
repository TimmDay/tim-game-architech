import { X } from "lucide-react"
import { useEffect, useRef } from "react"
import { AcronymScope } from "./Abbr"

/** Open modals, oldest first. */
const open: symbol[] = []

export function Modal({
  onClose,
  children,
  wide,
}: {
  onClose: () => void
  children: React.ReactNode
  wide?: boolean | "xl"
}) {
  // Subscribe once and read the latest onClose through a ref. Re-subscribing
  // on every render dropped Escape: another keydown listener re-rendered first,
  // and the listener was swapped out mid-dispatch.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  }, [onClose])
  useEffect(() => {
    // Modals can stack (a concept card over a result). Escape closes only
    // the one on top.
    const token = Symbol("modal")
    open.push(token)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open[open.length - 1] === token) close.current()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      const i = open.indexOf(token)
      if (i >= 0) open.splice(i, 1)
    }
  }, [])
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        onClick={(e) => e.stopPropagation()}
        className={`pop relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/60 ${wide === "xl" ? "max-w-3xl" : wide ? "max-w-xl" : "max-w-md"}`}
      >
        {/* Outside the scrolling body, so the close button never scrolls away. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 rounded-lg bg-slate-900/80 p-1.5 text-slate-400 backdrop-blur hover:bg-white/5 hover:text-white"
        >
          <X size={18} />
        </button>
        <div
          className="min-h-0 overflow-y-auto p-5"
          style={{
            paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <AcronymScope>{children}</AcronymScope>
        </div>
      </div>
    </div>
  )
}

/**
 * A modal's heading. It sticks to the top of the scrolling body, so the
 * title stays in view (with the close button beside it) on a long modal.
 */
export function ModalHeader({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`sticky -top-5 z-[5] -mx-5 -mt-5 mb-4 border-b border-white/8 bg-slate-900/95 px-5 pt-4 pr-12 pb-3 backdrop-blur ${className}`}
    >
      {children}
    </div>
  )
}
