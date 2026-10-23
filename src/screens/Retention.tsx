import { deviceId } from "~/game/device"
import clsx from "clsx"
import { Brain, Check, ChevronLeft, Play, RotateCcw, X } from "lucide-react"
import { useMemo, useState } from "react"
import { DECKS } from "~/decks"
import { CATEGORY_LABEL, type DeckCard } from "~/decks/types"
import { getReview, updateReview, useReview } from "~/game/points-store"
import { dueQueue, nextDue, review, reviewValue } from "~/game/review"
import { clearBuild } from "~/game/storage"
import { levelById, type Level } from "~/levels"
import type { Provider } from "~/providers/names"
import { QUIZZES, type Question } from "~/quiz/questions"
import { Rich } from "~/ui/Rich"

type Item =
  | { id: string; kind: "card"; card: DeckCard; level: Level }
  | { id: string; kind: "mc"; q: Question; options: string[]; level: Level }
  | { id: string; kind: "level"; level: Level }

const shuffle = <T,>(xs: T[]) => {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = out[i]
    const b = out[j]
    if (a === undefined || b === undefined) continue
    out[i] = b
    out[j] = a
  }
  return out
}

/** Turn a review id back into the thing it refers to; undefined if it's gone. */
function resolve(id: string): Item | undefined {
  const [kind, a, b] = id.split(":")
  if (kind === "card" && a && b) {
    const card = DECKS[a]?.find((c) => c.id === `${a}:${b}`)
    const level = levelById(a)
    return card && level ? { id, kind: "card", card, level } : undefined
  }
  if (kind === "mc" && a && b) {
    const q = QUIZZES[a]?.[Number(b)]
    const level = levelById(a)
    return q && level
      ? { id, kind: "mc", q, options: shuffle([q.correct, ...q.wrong]), level }
      : undefined
  }
  if (kind === "level" && a) {
    const level = levelById(a)
    return level ? { id, kind: "level", level } : undefined
  }
  return undefined
}

const when = (t: number) => {
  if (!Number.isFinite(t)) return null
  const days = Math.ceil((t - Date.now()) / 86_400_000)
  return days <= 1 ? "tomorrow" : `in ${days} days`
}

/**
 * Retention: revise what you've already met. Cards you got right come back
 * less and less often; ones you missed come back tomorrow and are worth more.
 */
export function Retention({
  provider,
  onBack,
  onPlay,
  toggle,
}: {
  provider: Provider
  onBack: () => void
  onPlay: (levelId: string) => void
  toggle: React.ReactNode
}) {
  const state = useReview()
  // The queue is fixed when the session starts, so answering doesn't reshuffle it.
  const [queue] = useState(() =>
    dueQueue(getReview(), Date.now()).flatMap((id) => resolve(id) ?? []),
  )
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)
  const [earned, setEarned] = useState(0)
  const [results, setResults] = useState<Record<string, boolean>>({})

  const item = queue[index]
  const value = item ? reviewValue(state, item.id) : 0
  const weak = item ? (state.items[item.id]?.weak ?? false) : false

  const answer = (right: boolean) => {
    if (!item) return
    const now = Date.now()
    let got = 0
    updateReview((s) => {
      const r = review(s, item.id, right, now, deviceId())
      got = r.earned
      return r.state
    })
    setEarned((e) => e + got)
    setResults((r) => ({ ...r, [item.id]: right }))
  }
  const next = () => {
    setIndex((i) => i + 1)
    setFlipped(false)
    setChosen(null)
  }

  const upcoming = useMemo(() => when(nextDue(state)), [state])
  const doneCount = Object.keys(results).length
  const rightCount = Object.values(results).filter(Boolean).length

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="flex shrink-0 items-center gap-2 border-b border-white/5 bg-slate-950/60 px-3 pb-2 backdrop-blur"
        style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex-1" />
        {toggle}
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-5 pb-10">
        <p className="font-mono text-[10px] tracking-[0.2em] text-emerald-300/80 uppercase">
          Retention
        </p>
        <h1 className="font-display text-2xl font-bold text-white">
          Revise what you've met
        </h1>
        <p className="mt-1 text-[14px] leading-relaxed text-slate-400">
          Cards and questions you've seen come back on a schedule: rarely once
          you know them, tomorrow if you missed them. Right answers earn 1
          point, or 2 for one you'd got wrong before. Passed scenarios come back
          after a week, worth 25.
        </p>

        {queue.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center">
            <Brain size={28} className="mx-auto text-emerald-300" />
            <p className="mt-3 text-[15px] text-slate-200">Nothing is due.</p>
            <p className="mt-1 text-[13px] text-slate-400">
              {upcoming
                ? `The next review is due ${upcoming}.`
                : "Play a level, flip some deck cards or take a quiz, and they'll start coming back here."}
            </p>
          </div>
        ) : !item ? (
          <div className="mt-8 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.05] p-6 text-center">
            <p className="font-display text-3xl font-bold text-white">
              +{earned} points
            </p>
            <p className="mt-1 text-[14px] text-slate-300">
              {rightCount} of {doneCount} right. Missed ones come back tomorrow.
            </p>
            {upcoming && (
              <p className="mt-1 text-[12px] text-slate-500">
                Next review due {upcoming}.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-center justify-between font-mono text-[11px] text-slate-500">
              <span>
                {index + 1} / {queue.length} · {item.level.title}
              </span>
              <span className={weak ? "text-amber-300" : undefined}>
                {item.kind === "level"
                  ? `worth ${value}`
                  : `worth ${value}${weak ? " (missed last time)" : ""}`}
              </span>
            </div>

            <div className="mt-2 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/80 via-slate-900 to-emerald-950/60 p-6 shadow-2xl shadow-black/50">
              {item.kind === "card" && (
                <>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-slate-200 uppercase">
                    {CATEGORY_LABEL[item.card.category]}
                  </span>
                  <p className="font-display mt-4 text-[20px] leading-snug font-semibold text-white">
                    <Rich text={item.card.prompt} provider={provider} />
                  </p>
                  {flipped ? (
                    <ul className="mt-4 space-y-2">
                      {item.card.points.map((p, i) => (
                        <li
                          key={i}
                          className="text-[14px] leading-relaxed text-slate-200"
                        >
                          • <Rich text={p} provider={provider} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-6 text-[12px] text-slate-500">
                      Answer it out loud, then flip to check.
                    </p>
                  )}
                </>
              )}

              {item.kind === "mc" && (
                <>
                  <p className="font-display text-[18px] leading-snug font-semibold text-white">
                    <Rich text={item.q.prompt} provider={provider} />
                  </p>
                  <div className="mt-4 space-y-2">
                    {item.options.map((o) => {
                      const isRight = o === item.q.correct
                      return (
                        <button
                          key={o}
                          type="button"
                          disabled={chosen !== null}
                          onClick={() => {
                            setChosen(o)
                            answer(isRight)
                          }}
                          className={clsx(
                            "flex w-full gap-2 rounded-xl border px-3.5 py-3 text-left text-[14px] leading-snug",
                            chosen === null
                              ? "border-white/10 bg-white/[0.03] text-slate-100 hover:border-emerald-300/50"
                              : isRight
                                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-50"
                                : o === chosen
                                  ? "border-rose-400/60 bg-rose-400/10 text-rose-50"
                                  : "border-white/5 text-slate-500",
                          )}
                        >
                          <span className="flex-1">
                            <Rich text={o} provider={provider} />
                          </span>
                          {chosen !== null && isRight && (
                            <Check size={16} className="text-emerald-300" />
                          )}
                          {o === chosen && !isRight && (
                            <X size={16} className="text-rose-300" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {chosen !== null && (
                    <p className="mt-3 text-[13px] leading-relaxed text-slate-300">
                      <Rich text={item.q.why} provider={provider} />
                    </p>
                  )}
                </>
              )}

              {item.kind === "level" && (
                <>
                  <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 font-mono text-[10px] tracking-wider text-emerald-200 uppercase">
                    Scenario revisit
                  </span>
                  <p className="font-display mt-4 text-[20px] leading-snug font-semibold text-white">
                    Rebuild {item.level.title} from scratch.
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-300">
                    <Rich text={item.level.tagline} provider={provider} /> You
                    passed it at least a week ago. Earn a star again on an empty
                    board to collect {value} points.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      clearBuild(item.level.id)
                      onPlay(item.level.id)
                    }}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 py-2.5 text-[14px] font-bold text-slate-950"
                  >
                    <Play size={15} /> Start with an empty board
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              {item.kind === "card" &&
                (flipped ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        answer(false)
                        next()
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-300/40 bg-amber-300/10 py-2.5 text-[14px] font-semibold text-amber-100"
                    >
                      <RotateCcw size={15} /> Missed it
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        answer(true)
                        next()
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300/40 bg-emerald-300/10 py-2.5 text-[14px] font-semibold text-emerald-100"
                    >
                      <Check size={15} /> Got it
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFlipped(true)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-2.5 text-[14px] font-bold text-slate-950"
                  >
                    Flip
                  </button>
                ))}
              {item.kind === "mc" && chosen !== null && (
                <button
                  type="button"
                  onClick={next}
                  className="flex-1 rounded-xl bg-cyan-300 py-2.5 text-[14px] font-bold text-slate-950"
                >
                  Next
                </button>
              )}
              {item.kind === "level" && (
                <button
                  type="button"
                  onClick={next}
                  className="flex-1 rounded-xl border border-white/15 py-2.5 text-[14px] text-slate-300"
                >
                  Skip for now
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
