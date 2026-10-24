import { RefreshCw } from "lucide-react"
import { applyUpdate, useUpdateReady } from "~/pwa"

/** A new version is waiting: offer it, never force it. */
export function UpdateToast() {
  const ready = useUpdateReady()
  if (!ready) return null
  return (
    <div
      // Clear of the play screen's tab bar on phones.
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 rounded-full border border-cyan-300/40 bg-slate-950/95 py-1.5 pr-1.5 pl-4 text-[13px] text-cyan-100 shadow-lg shadow-cyan-500/10 backdrop-blur"
      >
        A new version of Architech is ready.
        <button
          type="button"
          onClick={() => void applyUpdate()}
          className="flex items-center gap-1.5 rounded-full bg-cyan-300 px-3 py-1.5 font-semibold text-slate-950"
        >
          <RefreshCw size={14} /> Reload
        </button>
      </div>
    </div>
  )
}
