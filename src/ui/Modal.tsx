import { X } from "lucide-react"
import { useEffect, useRef } from "react"

export function Modal({
  onClose,
  children,
  wide,
}: {
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  // Subscribe once and read the latest onClose through a ref. Re-subscribing
  // on every render dropped Escape: another keydown listener re-rendered first,
  // and the listener was swapped out mid-dispatch.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  }, [onClose])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
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
        className={`pop relative max-h-[88dvh] w-full overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl shadow-black/60 ${wide ? "max-w-xl" : "max-w-md"}`}
        style={{
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}
