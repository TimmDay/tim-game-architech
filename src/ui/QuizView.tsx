import clsx from "clsx"
import { Check, Layers, Lock, RotateCcw, Unlock, X } from "lucide-react"
import { useState } from "react"
import { DECKS } from "~/decks"
import { loadQuiz, saveQuiz } from "~/game/storage"
import type { Level } from "~/levels"
import type { Provider } from "~/providers/names"
import { PASS_MARK, QUIZZES, type Question } from "~/quiz/questions"
import { H } from "./panels"
import { Rich } from "./Rich"

const shuffle = <T,>(items: T[]): T[] => {
  const out = [...items]
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

type Attempt = {
  questions: { q: Question; options: string[] }[]
  answers: (string | undefined)[]
}

/** A fresh attempt: question order and option order both reshuffled. */
const newAttempt = (level: Level): Attempt => {
  const qs = shuffle(QUIZZES[level.id] ?? []).map((q) => ({
    q,
    options: shuffle([q.correct, ...q.wrong]),
  }))
  return { questions: qs, answers: qs.map(() => undefined) }
}

/**
 * The check between the player and the suggested solution: ten questions,
 * eight to pass. Every question links the deck card that teaches it.
 */
export function QuizView({
  level,
  provider,
  onPassed,
  onOpenSolution,
  onOpenDeck,
}: {
  level: Level
  provider: Provider
  onPassed: () => void
  onOpenSolution: () => void
  onOpenDeck: () => void
}) {
  const [attempt, setAttempt] = useState(() => newAttempt(level))
  const [index, setIndex] = useState(0)
  const [record, setRecord] = useState(() => loadQuiz(level.id))
  const deck = DECKS[level.id] ?? []

  const total = attempt.questions.length
  const done = attempt.answers.every((a) => a !== undefined)
  const score = attempt.questions.filter(
    (x, i) => attempt.answers[i] === x.q.correct,
  ).length
  const current = attempt.questions[index]
  const chosen = attempt.answers[index]
  const passed = score >= PASS_MARK

  const [showResults, setShowResults] = useState(false)

  const finish = () => {
    const next = {
      best: Math.max(record.best, score),
      passed: record.passed || score >= PASS_MARK,
    }
    setRecord(next)
    saveQuiz(level.id, next)
    setShowResults(true)
    if (next.passed) onPassed()
  }

  const answer = (option: string) => {
    if (chosen !== undefined) return
    setAttempt((a) => ({
      ...a,
      answers: a.answers.map((x, i) => (i === index ? option : x)),
    }))
  }

  const next = () => {
    if (index < total - 1) setIndex(index + 1)
    else finish()
  }

  const retry = () => {
    setAttempt(newAttempt(level))
    setIndex(0)
    setShowResults(false)
  }

  // ----- results -----------------------------------------------------------
  if (showResults && done) {
    return (
      <div className="space-y-4 text-center">
        <div
          className={clsx(
            "mx-auto grid size-16 place-items-center rounded-full",
            passed
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-rose-400/15 text-rose-300",
          )}
        >
          {passed ? <Unlock size={28} /> : <Lock size={28} />}
        </div>
        <div>
          <div className="font-display text-3xl font-bold text-white">
            {score} / {total}
          </div>
          <p className="mt-1 text-[14px] text-slate-300">
            {passed
              ? "Solution unlocked."
              : `You need ${PASS_MARK} to unlock the solution. The cards below cover what you missed.`}
          </p>
        </div>
        {!passed && (
          <ul className="space-y-1.5 text-left">
            {attempt.questions
              .filter((x, i) => attempt.answers[i] !== x.q.correct)
              .map(({ q }) => (
                <li
                  key={q.prompt}
                  className="rounded-lg bg-white/[0.04] px-3 py-2 text-[13px] leading-snug text-slate-300"
                >
                  <span className="font-mono text-[10px] tracking-wider text-fuchsia-300/80 uppercase">
                    Card {q.card + 1}
                  </span>{" "}
                  <Rich text={deck[q.card]?.prompt ?? ""} provider={provider} />
                </li>
              ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {passed ? (
            <button
              type="button"
              onClick={onOpenSolution}
              className="flex-1 rounded-xl bg-amber-300 py-2.5 text-[14px] font-bold text-slate-950"
            >
              See suggested solution
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenDeck}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-fuchsia-300/40 py-2.5 text-[14px] text-fuchsia-100"
              >
                <Layers size={15} /> Study the deck
              </button>
              <button
                type="button"
                onClick={retry}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-cyan-300 py-2.5 text-[14px] font-bold text-slate-950"
              >
                <RotateCcw size={15} /> Try again
              </button>
            </>
          )}
        </div>
        {record.best > 0 && !passed && (
          <p className="font-mono text-[11px] text-slate-500">
            Best so far: {record.best} / {total}
          </p>
        )}
      </div>
    )
  }

  if (!current) return null
  const card = deck[current.q.card]
  const right = chosen === current.q.correct

  // ----- one question ------------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="pr-8">
        <div className="font-mono text-[10px] tracking-[0.18em] text-amber-300/80 uppercase">
          Unlock the solution · {PASS_MARK} of {total} to pass
        </div>
        <div className="mt-2 flex gap-1">
          {attempt.questions.map((x, i) => {
            const a = attempt.answers[i]
            return (
              <span
                key={i}
                className={clsx(
                  "h-1.5 flex-1 rounded-full",
                  a === undefined
                    ? i === index
                      ? "bg-white/40"
                      : "bg-white/10"
                    : a === x.q.correct
                      ? "bg-emerald-400"
                      : "bg-rose-400",
                )}
              />
            )
          })}
        </div>
      </div>

      <p className="font-display text-[18px] leading-snug font-semibold text-white">
        <Rich text={current.q.prompt} provider={provider} />
      </p>

      <div className="space-y-2">
        {current.options.map((o, i) => {
          const isRight = o === current.q.correct
          const isChosen = o === chosen
          return (
            <button
              key={o}
              type="button"
              onClick={() => answer(o)}
              disabled={chosen !== undefined}
              className={clsx(
                "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[14px] leading-snug transition",
                chosen === undefined
                  ? "border-white/10 bg-white/[0.03] text-slate-100 hover:border-cyan-300/50 hover:bg-cyan-300/[0.05]"
                  : isRight
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-50"
                    : isChosen
                      ? "border-rose-400/60 bg-rose-400/10 text-rose-50"
                      : "border-white/5 text-slate-500",
              )}
            >
              <span className="mt-0.5 font-mono text-[11px] text-slate-500">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">
                <Rich text={o} provider={provider} />
              </span>
              {chosen !== undefined && isRight && (
                <Check size={16} className="mt-0.5 text-emerald-300" />
              )}
              {isChosen && !isRight && (
                <X size={16} className="mt-0.5 text-rose-300" />
              )}
            </button>
          )
        })}
      </div>

      {chosen !== undefined && (
        <div className="pop space-y-3">
          <p
            className={clsx(
              "rounded-xl p-3 text-[14px] leading-relaxed",
              right
                ? "bg-emerald-400/[0.07] text-emerald-50"
                : "bg-rose-400/[0.07] text-rose-50",
            )}
          >
            <span className="font-semibold">
              {right ? "Right. " : "Not quite. "}
            </span>
            <Rich text={current.q.why} provider={provider} />
          </p>
          {card && (
            <details className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/[0.04] px-3 py-2">
              <summary className="cursor-pointer text-[13px] text-fuchsia-100">
                From the deck: <Rich text={card.prompt} provider={provider} />
              </summary>
              <ul className="mt-2 space-y-1">
                {card.points.map((p, i) => (
                  <li
                    key={i}
                    className="text-[13px] leading-relaxed text-slate-300"
                  >
                    • <Rich text={p} provider={provider} />
                  </li>
                ))}
              </ul>
            </details>
          )}
          <button
            type="button"
            onClick={next}
            className="w-full rounded-xl bg-cyan-300 py-2.5 text-[14px] font-bold text-slate-950"
          >
            {index < total - 1 ? "Next question" : "See my score"}
          </button>
        </div>
      )}
      <H>
        Question {index + 1} of {total}
      </H>
    </div>
  )
}
