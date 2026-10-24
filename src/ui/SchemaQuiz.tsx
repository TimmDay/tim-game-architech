import clsx from "clsx"
import { ArrowLeft, ArrowRight, Check, Database, X } from "lucide-react"
import { useMemo, useState } from "react"
import { updateReview, useReview } from "~/game/points-store"
import { answerSchema } from "~/game/review"
import type { Provider } from "~/providers/names"
import { SCHEMA } from "~/quiz/schema"
import { Rich } from "./Rich"

/** Same order every time for a given question, different between questions. */
function order(n: number, seed: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i)
  let s = seed + 7
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    const a = out[i]
    const b = out[j]
    if (a === undefined || b === undefined) continue
    out[i] = b
    out[j] = a
  }
  return out
}

/**
 * A level's schema and API questions, one at a time: pick an option, see
 * whether it's right and why. A point each, the first time it's right.
 */
export function SchemaQuiz({
  levelId,
  provider,
}: {
  levelId: string
  provider: Provider
}) {
  const questions = useMemo(() => SCHEMA[levelId] ?? [], [levelId])
  const review = useReview()
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [earned, setEarned] = useState(false)
  const q = questions[index]
  const options = useMemo(() => {
    if (!q) return []
    const all = [q.correct, ...q.wrong]
    return order(all.length, index).map((i) => all[i] ?? "")
  }, [q, index])
  if (!q) return null

  const key = (i: number) => `schema:${levelId}:${i}`
  const right = questions.filter((_, i) => review.awarded[key(i)]).length
  const go = (i: number) => {
    setIndex(Math.max(0, Math.min(questions.length - 1, i)))
    setPicked(null)
    setEarned(false)
  }
  const pick = (o: string) => {
    if (picked) return
    const correct = o === q.correct
    setPicked(o)
    setEarned(correct && !review.awarded[key(index)])
    updateReview((s) => answerSchema(s, levelId, index, correct))
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
        <span className="text-green-300">
          {right} of {questions.length} answered right
        </span>
        <span>
          {index + 1} / {questions.length}
        </span>
      </div>
      <div className="mt-2 rounded-3xl border border-green-300/25 bg-gradient-to-br from-slate-900 to-green-950/40 p-6 shadow-2xl shadow-black/50">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-300/15 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-green-200 uppercase">
          <Database size={11} /> Schema & API
        </span>
        <p className="font-display mt-5 text-[20px] leading-snug font-semibold text-white sm:text-[22px]">
          <Rich text={q.prompt} provider={provider} />
        </p>
        <div className="mt-5 space-y-2">
          {options.map((o) => {
            const isRight = o === q.correct
            const state = !picked
              ? "idle"
              : isRight
                ? "right"
                : o === picked
                  ? "wrong"
                  : "dim"
            return (
              <button
                key={o}
                type="button"
                disabled={picked !== null}
                onClick={() => pick(o)}
                className={clsx(
                  "flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left text-[15px] leading-snug",
                  state === "idle" &&
                    "border-white/10 bg-white/[0.03] text-slate-100 hover:border-green-300/50",
                  state === "right" &&
                    "border-green-300/60 bg-green-300/15 text-green-50",
                  state === "wrong" &&
                    "border-rose-300/50 bg-rose-300/10 text-rose-100",
                  state === "dim" && "border-white/5 text-slate-500",
                )}
              >
                {state === "right" && (
                  <Check size={17} className="mt-0.5 shrink-0 text-green-300" />
                )}
                {state === "wrong" && (
                  <X size={17} className="mt-0.5 shrink-0 text-rose-300" />
                )}
                <span>
                  <Rich text={o} provider={provider} />
                </span>
              </button>
            )
          })}
        </div>
        {picked && (
          <p className="mt-4 text-[14px] leading-relaxed text-slate-300">
            {earned && (
              <span className="mr-1.5 font-semibold text-green-300">
                +1 point.
              </span>
            )}
            <Rich text={q.why} provider={provider} />
          </p>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          aria-label="Previous question"
          className="grid size-11 place-items-center rounded-xl border border-white/10 text-slate-300 disabled:opacity-30"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index >= questions.length - 1}
          className="flex-1 rounded-xl border border-green-300/40 bg-green-300/10 py-2.5 text-[14px] font-semibold text-green-100 disabled:opacity-30"
        >
          {picked ? "Next question" : "Skip"}
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index >= questions.length - 1}
          aria-label="Next question"
          className="grid size-11 place-items-center rounded-xl border border-white/10 text-slate-300 disabled:opacity-30"
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
