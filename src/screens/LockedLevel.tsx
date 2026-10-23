import { Layers, Lock } from "lucide-react"
import type { Level } from "~/levels"

/** Shown when a link points at a level whose prerequisites aren't done. */
export function LockedLevel({
  level,
  missing,
  onHome,
  onDeck,
}: {
  level: Level
  missing: string[]
  onHome: () => void
  onDeck: () => void
}) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-6 text-center">
      <div>
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-white/5 text-slate-300">
          <Lock size={26} />
        </div>
        <h1 className="font-display mt-4 text-2xl font-bold text-white">
          {level.title} is locked
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-400">
          It builds on ideas from {missing.join(" and ")}. Earn a star there
          first.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onHome}
            className="rounded-xl bg-cyan-300 py-2.5 text-[14px] font-bold text-slate-950"
          >
            Back to the levels
          </button>
          <button
            type="button"
            onClick={onDeck}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2.5 text-[14px] text-slate-200"
          >
            <Layers size={15} /> Read its discussion deck meanwhile
          </button>
        </div>
      </div>
    </main>
  )
}
