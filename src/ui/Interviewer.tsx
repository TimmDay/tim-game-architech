import clsx from "clsx"
import {
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquareQuote,
  Pause,
  Play,
  SkipForward,
  Star,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import {
  interviewPlan,
  promptKey,
  summarise,
  TOTAL_MINUTES,
  type Mark,
  type PhaseId,
  type Prompt,
} from "~/game/interview"
import { updateReview } from "~/game/points-store"
import { answerEstimate, seeCard } from "~/game/review"
import { loadDeckMarks, saveDeckMarks } from "~/game/storage"
import type { Provider } from "~/providers/names"
import { Rich } from "./Rich"

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

/** What the interviewer says to open a prompt. */
function promptText(p: Prompt): string {
  if (p.kind === "build")
    return "Let's see the design. Draw it on the board and talk me through each part as you place it. Run the load test when you're happy with it."
  return p.card.prompt
}

/** What a strong answer covers, shown once you've said yours. */
function Expected({ p, provider }: { p: Prompt; provider: Provider }) {
  if (p.kind === "build") return null
  if (p.kind === "estimate" && p.card.kind === "mc")
    return (
      <div className="space-y-1.5 text-[13px] leading-relaxed text-slate-200">
        <p className="font-semibold text-emerald-200">
          <Rich text={p.card.correct} provider={provider} />
        </p>
        <p className="text-slate-300">
          <Rich text={p.card.why} provider={provider} />
        </p>
      </div>
    )
  // Deck cards and talking estimates both carry points.
  const c = p.card
  if (!("points" in c)) return null
  const points = c.points
  const followUp = c.followUp
  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {points.map((t, i) => (
          <li
            key={i}
            className="flex gap-2 text-[13px] leading-relaxed text-slate-200"
          >
            <span className="text-cyan-300/80">•</span>
            <span>
              <Rich text={t} provider={provider} />
            </span>
          </li>
        ))}
      </ul>
      {followUp && (
        <p className="rounded-lg bg-white/[0.04] p-2 text-[13px] leading-relaxed text-amber-100/90">
          <span className="font-semibold">They push: </span>
          <Rich text={followUp} provider={provider} />
        </p>
      )}
    </div>
  )
}

/**
 * The interviewer, over the board: a 45-minute clock, the phases, and one
 * prompt at a time. Marks feed the deck and Retention the way the deck does.
 */
export function Interviewer({
  levelId,
  provider,
  lastStars,
  hidden,
  onDeck,
  onClose,
}: {
  levelId: string
  provider: Provider
  /** Stars from the latest load test, for the design phase. */
  lastStars: number | null
  /** While a load test runs, the board needs the room. */
  hidden: boolean
  onDeck: () => void
  onClose: () => void
}) {
  const plan = useMemo(() => interviewPlan(levelId), [levelId])
  const [phase, setPhase] = useState(0)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [marks, setMarks] = useState<Record<string, Mark>>({})
  const [seconds, setSeconds] = useState<Partial<Record<PhaseId, number>>>({})
  const [paused, setPaused] = useState(false)
  const [open, setOpen] = useState(true)
  const done = phase >= plan.length
  const current = plan[phase]
  const prompt = current?.prompts[index]

  useEffect(() => {
    if (paused || done || !current) return
    const id = current.id
    const t = setInterval(
      () => setSeconds((s) => ({ ...s, [id]: (s[id] ?? 0) + 1 })),
      1000,
    )
    return () => clearInterval(t)
  }, [paused, done, current])

  const total = Object.values(seconds).reduce((a, b) => a + (b ?? 0), 0)
  const inPhase = current ? (seconds[current.id] ?? 0) : 0
  const over = current ? inPhase > current.minutes * 60 : false

  const nextPhase = () => {
    // Skip past phases with nothing to ask (a level without estimates).
    let p = phase + 1
    while (p < plan.length && plan[p]?.prompts.length === 0) p++
    setPhase(p)
    setIndex(0)
    setRevealed(false)
  }
  const next = () => {
    setRevealed(false)
    if (current && index + 1 < current.prompts.length) setIndex(index + 1)
    else nextPhase()
  }
  const mark = (m: Mark) => {
    if (!prompt) return
    setMarks((x) => ({ ...x, [promptKey(prompt)]: m }))
    const now = Date.now()
    if (prompt.kind === "card") {
      const id = prompt.card.id
      saveDeckMarks(levelId, {
        ...loadDeckMarks(levelId),
        [id]: m === "covered" ? "got" : "revisit",
      })
      updateReview((s) => seeCard(s, id, m === "covered", now))
    } else if (prompt.kind === "estimate") {
      const i = prompt.index
      updateReview((s) => answerEstimate(s, levelId, i, m === "covered"))
    }
    next()
  }

  if (hidden) return null
  const shell =
    "pointer-events-auto absolute bottom-3 left-3 z-20 w-[min(26rem,calc(100%-1.5rem))] rounded-2xl border border-fuchsia-300/30 bg-slate-950/95 shadow-2xl shadow-fuchsia-500/10 backdrop-blur"

  const header = (
    <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
      <MessageSquareQuote size={15} className="text-fuchsia-300" />
      <span className="font-mono text-[11px] tracking-[0.16em] text-fuchsia-200 uppercase">
        Mock interview
      </span>
      <span
        className={clsx(
          "ml-1 font-mono text-[12px]",
          total > TOTAL_MINUTES * 60 ? "text-amber-300" : "text-slate-300",
        )}
      >
        {clock(total)} / {TOTAL_MINUTES}:00
      </span>
      <span className="flex-1" />
      {!done && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label={paused ? "Resume the clock" : "Pause the clock"}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
        aria-label={open ? "Fold the interviewer away" : "Show the interviewer"}
      >
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
        aria-label="End the interview"
      >
        <X size={14} />
      </button>
    </div>
  )

  if (done) {
    const s = summarise(plan, marks, seconds)
    return (
      <div className={shell} role="region" aria-label="Mock interview">
        {header}
        {open && (
          <div className="max-h-[55vh] space-y-3 overflow-y-auto p-3">
            <p className="font-display text-lg font-bold text-white">
              {s.asked ? `${Math.round(s.score * 100)}% covered` : "Done"}
              <span className="ml-2 font-mono text-[12px] font-normal text-slate-400">
                {s.covered} of {s.asked} prompts, in {clock(total)}
              </span>
            </p>
            <table className="w-full text-[12px]">
              <tbody>
                {s.phases.map((p) => (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="py-1 text-slate-200">{p.title}</td>
                    <td className="py-1 text-right font-mono text-slate-300">
                      {p.id === "design" ? "" : `${p.covered}/${p.total}`}
                    </td>
                    <td
                      className={clsx(
                        "py-1 text-right font-mono",
                        p.seconds > p.budget
                          ? "text-amber-300"
                          : "text-slate-400",
                      )}
                    >
                      {clock(p.seconds)} / {p.budget / 60}:00
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {s.missed.length > 0 && (
              <div>
                <p className="mb-1 text-[12px] text-slate-400">
                  Missed, now marked to revisit in the deck and in Retention:
                </p>
                <ul className="space-y-1">
                  {s.missed.map((p) => (
                    <li
                      key={promptKey(p)}
                      className="text-[12px] leading-snug text-rose-100/90"
                    >
                      • <Rich text={promptText(p)} provider={provider} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDeck}
                className="flex-1 rounded-xl border border-fuchsia-300/40 py-2 text-[13px] text-fuchsia-100 hover:border-fuchsia-300/70"
              >
                Open the deck
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-fuchsia-300 py-2 text-[13px] font-bold text-slate-950"
              >
                Finish
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!current || !prompt) return null
  return (
    <div className={shell} role="region" aria-label="Mock interview">
      {header}
      {open && (
        <div className="max-h-[55vh] space-y-3 overflow-y-auto p-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="font-display text-[15px] font-bold text-white">
                {current.title}
              </span>
              <span className="ml-2 font-mono text-[11px] text-slate-500">
                {index + 1}/{current.prompts.length}
              </span>
            </div>
            <span
              className={clsx(
                "font-mono text-[12px]",
                over ? "text-amber-300" : "text-slate-400",
              )}
            >
              {clock(inPhase)} / {current.minutes}:00
            </span>
          </div>
          <p className="text-[12px] text-slate-400">{current.goal}</p>
          {over && (
            <p className="text-[12px] text-amber-200">
              Time&apos;s up for this part. Finish this answer, then move on.
            </p>
          )}
          <blockquote className="rounded-xl border border-white/8 bg-white/[0.04] p-3 text-[14px] leading-relaxed text-slate-100">
            <Rich text={promptText(prompt)} provider={provider} />
          </blockquote>

          {prompt.kind === "build" ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[13px] text-slate-300">
                Latest load test:{" "}
                {lastStars === null ? (
                  "not run yet"
                ) : (
                  <span className="inline-flex gap-0.5">
                    {[1, 2, 3].map((n) => (
                      <Star
                        key={n}
                        size={13}
                        className={
                          n <= lastStars
                            ? "fill-amber-300 text-amber-300"
                            : "text-slate-600"
                        }
                      />
                    ))}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() =>
                  mark(
                    lastStars !== null && lastStars > 0 ? "covered" : "missed",
                  )
                }
                className="w-full rounded-xl bg-fuchsia-300 py-2 text-[13px] font-bold text-slate-950"
              >
                On to the deep dive
              </button>
            </div>
          ) : !revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="w-full rounded-xl bg-fuchsia-300 py-2 text-[13px] font-bold text-slate-950"
            >
              I&apos;ve answered out loud: show what a strong answer covers
            </button>
          ) : (
            <div className="space-y-3">
              <Expected p={prompt} provider={provider} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => mark("covered")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300/40 py-2 text-[13px] text-emerald-100 hover:border-emerald-300/70"
                >
                  <Check size={14} /> Covered it
                </button>
                <button
                  type="button"
                  onClick={() => mark("missed")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-300/40 py-2 text-[13px] text-rose-100 hover:border-rose-300/70"
                >
                  <X size={14} /> Missed some
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={nextPhase}
            className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-white"
          >
            <SkipForward size={12} /> Skip to{" "}
            {plan[phase + 1]?.title ?? "the summary"}
          </button>
        </div>
      )}
    </div>
  )
}
