import clsx from "clsx"
import { Link2, Trash2 } from "lucide-react"
import { CLIENT_ID } from "~/sim/types"

/**
 * Phones only: Connect and Remove for whatever is selected, floating on the
 * board in the same row as Recenter, so they're never below the fold of the
 * inspector. Wide screens keep them in the side panel.
 */
export function BoardActions({
  node,
  edge,
  connecting,
  onConnect,
  onRemove,
  onRemoveEdge,
}: {
  node?: string
  edge?: string
  connecting: boolean
  onConnect: (id: string) => void
  onRemove: (id: string) => void
  onRemoveEdge: (id: string) => void
}) {
  if (!node && !edge) return null
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex gap-2 lg:hidden">
      {node && (
        <button
          type="button"
          onClick={() => onConnect(node)}
          className={clsx(
            "pointer-events-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold backdrop-blur",
            connecting
              ? "border-cyan-300 bg-cyan-300 text-slate-950"
              : "border-cyan-300/40 bg-slate-950/85 text-cyan-100",
          )}
        >
          <Link2 size={14} />
          {connecting ? "Tap the target…" : "Connect to…"}
        </button>
      )}
      {(edge || (node && node !== CLIENT_ID)) && (
        <button
          type="button"
          onClick={() => (edge ? onRemoveEdge(edge) : node && onRemove(node))}
          className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-slate-950/85 px-3 py-1.5 text-[13px] text-rose-200 backdrop-blur"
        >
          <Trash2 size={14} /> Remove
        </button>
      )}
    </div>
  )
}
