import { Check, Share2 } from "lucide-react"
import { useState } from "react"
import { shareText, type Daily, type DailyBest } from "~/game/daily"

/**
 * Copy the day's result for the team chat. Where the clipboard is refused,
 * the text is shown selected instead, to copy by hand.
 */
export function DailyShare({ daily, best }: { daily: Daily; best: DailyBest }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle")
  const text = shareText(daily, best, `${location.origin}/#/daily`)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setState("copied")
      setTimeout(() => setState("idle"), 2000)
    } catch {
      setState("manual")
    }
  }
  return (
    // Copying by hand needs room: the text takes a line of its own.
    <div className={state === "manual" ? "w-full" : undefined}>
      <button
        type="button"
        onClick={() => void copy()}
        className="flex items-center gap-1.5 rounded-xl border border-amber-300/40 px-4 py-2.5 text-[14px] text-amber-100 hover:border-amber-300/70"
      >
        {state === "copied" ? <Check size={15} /> : <Share2 size={15} />}
        {state === "copied" ? "Copied" : "Share result"}
      </button>
      {state === "manual" && (
        <textarea
          readOnly
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          rows={4}
          value={text}
          aria-label="Your result, to copy"
          className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 p-2 font-mono text-[12px] text-slate-200"
        />
      )}
    </div>
  )
}
