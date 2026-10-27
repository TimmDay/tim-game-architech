import clsx from "clsx"
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  Database,
  Eye,
  X,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { updateReview, useReview } from "~/game/points-store"
import { answerEstimate, answerSchema, type ReviewState } from "~/game/review"
import type { Provider } from "~/providers/names"
import { ESTIMATES, type EstimateCard } from "~/quiz/estimate"
import { SCHEMA } from "~/quiz/schema"
import { ReportButton } from "./ReportButton"
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

/** Tailwind needs whole class names, so each set's colours are spelled out. */
type Tone = {
  count: string
  card: string
  tag: string
  hover: string
  right: string
  tick: string
  next: string
}

const GREEN: Tone = {
  count: "text-green-300",
  card: "border-green-300/25 to-green-950/40",
  tag: "bg-green-300/15 text-green-200",
  hover: "hover:border-green-300/50",
  right: "border-green-300/60 bg-green-300/15 text-green-50",
  tick: "text-green-300",
  next: "border-green-300/40 bg-green-300/10 text-green-100",
}

const SKY: Tone = {
  count: "text-sky-300",
  card: "border-sky-300/25 to-sky-950/40",
  tag: "bg-sky-300/15 text-sky-200",
  hover: "hover:border-sky-300/50",
  right: "border-sky-300/60 bg-sky-300/15 text-sky-50",
  tick: "text-sky-300",
  next: "border-sky-300/40 bg-sky-300/10 text-sky-100",
}

/** A level's schema and API questions. A point each, the first time it's right. */
export function SchemaQuiz({
  levelId,
  provider,
}: {
  levelId: string
  provider: Provider
}) {
  const cards = useMemo(
    () =>
      (SCHEMA[levelId] ?? []).map((q): EstimateCard => ({ kind: "mc", ...q })),
    [levelId],
  )
  return (
    <CardQuiz
      cards={cards}
      prefix={`schema:${levelId}`}
      answer={(s, i, right) => answerSchema(s, levelId, i, right)}
      label="Schema & API"
      Icon={Database}
      tone={GREEN}
      done="answered right"
      provider={provider}
    />
  )
}

/** A level's estimation cards: choices to pick, and sums to work out loud. */
export function EstimateQuiz({
  levelId,
  provider,
}: {
  levelId: string
  provider: Provider
}) {
  return (
    <CardQuiz
      cards={ESTIMATES[levelId] ?? []}
      prefix={`est:${levelId}`}
      answer={(s, i, right) => answerEstimate(s, levelId, i, right)}
      label="Estimation"
      Icon={Calculator}
      tone={SKY}
      done="done"
      provider={provider}
    />
  )
}

/**
 * One card at a time: pick an option and see whether it's right and why, or
 * work a prompt out, then reveal what a strong answer covers.
 */
function CardQuiz({
  cards,
  prefix,
  answer,
  label,
  Icon,
  tone,
  done,
  provider,
}: {
  cards: EstimateCard[]
  /** Award keys are `${prefix}:${index}`. */
  prefix: string
  answer: (s: ReviewState, index: number, right: boolean) => ReviewState
  label: string
  Icon: LucideIcon
  tone: Tone
  /** "3 of 5 {done}" */
  done: string
  provider: Provider
}) {
  const review = useReview()
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [earned, setEarned] = useState(false)
  const card = cards[index]
  const options = useMemo(() => {
    if (card?.kind !== "mc") return []
    const all = [card.correct, ...card.wrong]
    return order(all.length, index).map((i) => all[i] ?? "")
  }, [card, index])
  if (!card) return null

  const key = (i: number) => `${prefix}:${i}`
  const right = cards.filter((_, i) => review.awarded[key(i)]).length
  const go = (i: number) => {
    setIndex(Math.max(0, Math.min(cards.length - 1, i)))
    setPicked(null)
    setEarned(false)
  }
  // A prompt's reveal counts as its answer: there's nothing to get wrong.
  const pick = (o: string) => {
    if (picked) return
    const correct = card.kind === "talk" || o === card.correct
    setPicked(o)
    setEarned(correct && !review.awarded[key(index)])
    updateReview((s) => answer(s, index, correct))
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
        <span className={tone.count}>
          {right} of {cards.length} {done}
        </span>
        <span>
          {index + 1} / {cards.length}
        </span>
      </div>
      <div
        className={clsx(
          "mt-2 rounded-3xl border bg-gradient-to-br from-slate-900 p-6 shadow-2xl shadow-black/50",
          tone.card,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider uppercase",
              tone.tag,
            )}
          >
            <Icon size={11} /> {label}
          </span>
          <ReportButton
            report={{
              id: key(index),
              kind: label,
              lines:
                card.kind === "mc"
                  ? [
                      card.prompt,
                      `✓ ${card.correct}`,
                      ...card.wrong.map((w) => `✗ ${w}`),
                      card.why,
                    ]
                  : [card.prompt, ...card.points, card.followUp ?? ""],
            }}
          />
        </div>
        <p className="font-display mt-5 text-[20px] leading-snug font-semibold text-white sm:text-[22px]">
          <Rich text={card.prompt} provider={provider} />
        </p>
        {card.kind === "mc" ? (
          <div className="mt-5 space-y-2">
            {options.map((o) => {
              const isRight = o === card.correct
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
                      clsx(
                        "border-white/10 bg-white/[0.03] text-slate-100",
                        tone.hover,
                      ),
                    state === "right" && tone.right,
                    state === "wrong" &&
                      "border-rose-300/50 bg-rose-300/10 text-rose-100",
                    state === "dim" && "border-white/5 text-slate-500",
                  )}
                >
                  {state === "right" && (
                    <Check
                      size={17}
                      className={clsx("mt-0.5 shrink-0", tone.tick)}
                    />
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
        ) : picked ? (
          <>
            <ul className="mt-5 space-y-2.5">
              {card.points.map((p, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-[15px] leading-relaxed text-slate-100"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-300" />
                  <span>
                    <Rich text={p} provider={provider} />
                  </span>
                </li>
              ))}
            </ul>
            {card.followUp && (
              <p className="mt-5 rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/[0.07] p-3 text-[14px] leading-relaxed text-fuchsia-50">
                <span className="font-semibold text-fuchsia-200">
                  They'll push with:{" "}
                </span>
                <Rich text={card.followUp} provider={provider} />
              </p>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => pick("reveal")}
            className={clsx(
              "mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[14px] font-semibold",
              tone.next,
            )}
          >
            <Eye size={15} /> Work it out loud, then reveal
          </button>
        )}
        {picked && (card.kind === "mc" || earned) && (
          <p className="mt-4 text-[14px] leading-relaxed text-slate-300">
            {earned && (
              <span className={clsx("mr-1.5 font-semibold", tone.tick)}>
                +1 point.
              </span>
            )}
            {card.kind === "mc" && <Rich text={card.why} provider={provider} />}
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
          disabled={index >= cards.length - 1}
          className={clsx(
            "flex-1 rounded-xl border py-2.5 text-[14px] font-semibold disabled:opacity-30",
            tone.next,
          )}
        >
          {picked ? "Next question" : "Skip"}
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index >= cards.length - 1}
          aria-label="Next question"
          className="grid size-11 place-items-center rounded-xl border border-white/10 text-slate-300 disabled:opacity-30"
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
