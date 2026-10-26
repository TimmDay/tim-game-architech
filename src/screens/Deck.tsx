import clsx from "clsx"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  MessageCircleQuestion,
  RotateCcw,
  Shuffle,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { DECKS } from "~/decks"
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type CardCategory,
  type DeckCard,
} from "~/decks/types"
import { updateReview } from "~/game/points-store"
import { seeCard } from "~/game/review"
import { loadDeckMarks, saveDeckMarks, type CardMark } from "~/game/storage"
import type { Provider } from "~/providers/names"
import { ESTIMATES } from "~/quiz/estimate"
import { SCHEMA } from "~/quiz/schema"
import { InfoTip } from "~/ui/InfoTip"
import { ReportButton } from "~/ui/ReportButton"
import { Rich } from "~/ui/Rich"
import { EstimateQuiz, SchemaQuiz } from "~/ui/SchemaQuiz"

const CATEGORY_TONE: Record<CardCategory, string> = {
  clarify: "bg-cyan-300/15 text-cyan-200",
  product: "bg-pink-300/15 text-pink-200",
  decision: "bg-violet-300/15 text-violet-200",
  tradeoff: "bg-amber-300/15 text-amber-200",
  alternative: "bg-sky-300/15 text-sky-200",
  scale: "bg-emerald-300/15 text-emerald-200",
  "edge-case": "bg-orange-300/15 text-orange-200",
  resilience: "bg-teal-300/15 text-teal-200",
  security: "bg-rose-300/15 text-rose-200",
  observability: "bg-lime-300/15 text-lime-200",
}

type Filter = CardCategory | "all" | "revisit" | "schema" | "estimate"

/** Deterministic shuffle, so a reshuffle is a new order but a re-render isn't. */
function shuffled<T>(items: T[], seed: number): T[] {
  const out = [...items]
  let s = seed
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
 * A discussion deck: a level's, or a Fundamentals topic's. Each card is a prompt to answer out loud; the
 * back holds what a strong answer covers and where an interviewer goes next.
 */
export function Deck({
  source,
  provider,
  onBack,
  onPlay,
  toggle,
  start,
}: {
  /** Which deck: a level's id and title, or a topic's. */
  source: { id: string; title: string }
  provider: Provider
  onBack: () => void
  /** Absent for Fundamentals topics, which have no level to play. */
  onPlay?: () => void
  toggle: React.ReactNode
  /** Open on the schema and API questions, or the estimation cards. */
  start?: "schema" | "estimate"
}) {
  const level = source
  const all = useMemo(() => DECKS[level.id] ?? [], [level.id])
  const [marks, setMarks] = useState(() => loadDeckMarks(level.id))
  const [filter, setFilter] = useState<Filter>(
    start === "schema" && SCHEMA[source.id]?.length
      ? "schema"
      : start === "estimate" && ESTIMATES[source.id]?.length
        ? "estimate"
        : "all",
  )
  // The filter tags take a lot of room on a phone, so they start folded away.
  const [tagsOpen, setTagsOpen] = useState(filter !== "all")
  const [seed, setSeed] = useState(0)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const cards = useMemo(() => {
    // Interview order by default: clarify first, observability last.
    const ordered = [...all].sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
    )
    const base = seed ? shuffled(ordered, seed) : ordered
    if (filter === "all") return base
    if (filter === "schema" || filter === "estimate") return []
    if (filter === "revisit")
      return base.filter((c) => marks[c.id] === "revisit")
    return base.filter((c) => c.category === filter)
  }, [all, filter, seed, marks])

  const card: DeckCard | undefined = cards[Math.min(index, cards.length - 1)]
  const got = all.filter((c) => marks[c.id] === "got").length
  const revisit = all.filter((c) => marks[c.id] === "revisit").length

  const go = (delta: number) => {
    setFlipped(false)
    setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + delta)))
  }
  const mark = (m: CardMark) => {
    if (!card) return
    const next = { ...marks, [card.id]: m }
    setMarks(next)
    saveDeckMarks(level.id, next)
    const id = card.id
    updateReview((s) => seeCard(s, id, m === "got", Date.now()))
    // In the revisit filter, marking "got" removes the card from the list,
    // so the same index already shows the next one.
    if (!(filter === "revisit" && m === "got")) go(1)
    else setFlipped(false)
  }
  const pick = (f: Filter) => {
    setFilter(f)
    setIndex(0)
    setFlipped(false)
  }

  // Keyboard: Space flips, arrows move, 1 = revisit, 2 = got it. Subscribed
  // once, reading current handlers through a ref.
  const keys = useRef({ go, mark, flip: () => setFlipped((f) => !f) })
  useEffect(() => {
    keys.current = { go, mark, flip: () => setFlipped((f) => !f) }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = keys.current
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        k.flip()
      } else if (e.key === "ArrowRight") k.go(1)
      else if (e.key === "ArrowLeft") k.go(-1)
      else if (e.key === "1") k.mark("revisit")
      else if (e.key === "2") k.mark("got")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const schemaCount = SCHEMA[level.id]?.length ?? 0
  const estimateCount = ESTIMATES[level.id]?.length ?? 0
  const counts = useMemo(() => {
    const m = new Map<CardCategory, number>()
    for (const c of all) m.set(c.category, (m.get(c.category) ?? 0) + 1)
    return m
  }, [all])

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
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex-1" />
        {toggle}
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-10">
        <div className="flex items-center gap-1">
          <h1 className="font-mono text-[10px] tracking-[0.2em] text-fuchsia-300/80 uppercase">
            Discussion deck
          </h1>
          <InfoTip title={level.title}>
            Answer each prompt out loud, as you would in the room, then flip it
            to compare with what a strong answer covers.
          </InfoTip>
          {onPlay && (
            <button
              type="button"
              onClick={onPlay}
              className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-[13px] text-slate-200 hover:border-white/30"
            >
              Play the level
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="bg-emerald-400"
              style={{ width: `${(got / Math.max(1, all.length)) * 100}%` }}
            />
            <div
              className="bg-amber-400"
              style={{ width: `${(revisit / Math.max(1, all.length)) * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-500">
            <span>
              <span className="text-emerald-300">{got} got it</span> ·{" "}
              <span className="text-amber-300">{revisit} to revisit</span> ·{" "}
              {all.length} cards
              <button
                type="button"
                onClick={() => setTagsOpen((o) => !o)}
                aria-expanded={tagsOpen}
                aria-controls="deck-tags"
                className={clsx(
                  "ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 align-middle font-sans text-[11px]",
                  tagsOpen
                    ? "border-white/40 text-white"
                    : "border-white/10 text-slate-400 hover:text-white",
                )}
              >
                Tags
                {filter !== "all" && (
                  <span className="text-slate-300">
                    ·{" "}
                    {filter === "revisit"
                      ? "To revisit"
                      : filter === "schema"
                        ? "Schema & API"
                        : filter === "estimate"
                          ? "Estimation"
                          : CATEGORY_LABEL[filter]}
                  </span>
                )}
                <ChevronDown
                  size={11}
                  className={clsx(
                    "transition-transform",
                    tagsOpen && "rotate-180",
                  )}
                />
              </button>
            </span>
            {(got > 0 || revisit > 0) && (
              <button
                type="button"
                onClick={() => {
                  setMarks({})
                  saveDeckMarks(level.id, {})
                }}
                className="hover:text-white"
              >
                Clear marks
              </button>
            )}
          </div>
        </div>

        {/* Filters, folded away until the Tags button opens them */}
        <div
          id="deck-tags"
          hidden={!tagsOpen}
          className="mt-3 flex flex-wrap gap-1.5"
        >
          {(["all", ...CATEGORY_ORDER, "revisit"] as const).map((f) => {
            const n =
              f === "all"
                ? all.length
                : f === "revisit"
                  ? revisit
                  : (counts.get(f) ?? 0)
            if (n === 0 && f !== "all") return null
            return (
              <button
                key={f}
                type="button"
                onClick={() => pick(f)}
                className={clsx(
                  "rounded-full border px-2.5 py-1 text-[12px]",
                  filter === f
                    ? "border-white bg-white text-slate-950"
                    : "border-white/10 text-slate-400 hover:text-white",
                )}
              >
                {f === "all"
                  ? "All"
                  : f === "revisit"
                    ? "To revisit"
                    : CATEGORY_LABEL[f]}{" "}
                <span className="opacity-60">{n}</span>
              </button>
            )
          })}
          {estimateCount > 0 && (
            <button
              type="button"
              onClick={() => pick("estimate")}
              className={clsx(
                "rounded-full border px-2.5 py-1 text-[12px]",
                filter === "estimate"
                  ? "border-sky-300 bg-sky-300 text-slate-950"
                  : "border-sky-300/40 text-sky-200 hover:border-sky-300",
              )}
            >
              Estimation <span className="opacity-60">{estimateCount}</span>
            </button>
          )}
          {schemaCount > 0 && (
            <button
              type="button"
              onClick={() => pick("schema")}
              className={clsx(
                "rounded-full border px-2.5 py-1 text-[12px]",
                filter === "schema"
                  ? "border-green-300 bg-green-300 text-slate-950"
                  : "border-green-300/40 text-green-200 hover:border-green-300",
              )}
            >
              Schema & API <span className="opacity-60">{schemaCount}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSeed((s) => (s ? 0 : Date.now() % 100000) || 1)
              setIndex(0)
              setFlipped(false)
            }}
            className={clsx(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px]",
              seed
                ? "border-fuchsia-300 text-fuchsia-200"
                : "border-white/10 text-slate-400 hover:text-white",
            )}
          >
            <Shuffle size={12} /> {seed ? "Shuffled" : "Shuffle"}
          </button>
        </div>

        {filter === "schema" ? (
          <SchemaQuiz levelId={level.id} provider={provider} />
        ) : filter === "estimate" ? (
          <EstimateQuiz levelId={level.id} provider={provider} />
        ) : !card ? (
          <p className="mt-10 text-center text-[14px] text-slate-400">
            {filter === "revisit"
              ? "Nothing to revisit. Nice."
              : "No cards in this filter."}
          </p>
        ) : (
          <>
            {/* The card, with a 3D flip */}
            <div className="relative mt-5 [perspective:1400px]">
              {/* Outside the flip button: a link can't sit inside a button. */}
              <ReportButton
                className="absolute right-4 bottom-4 z-10"
                report={{
                  id: card.id,
                  kind: "Discussion card",
                  lines: [card.prompt, ...card.points, card.followUp ?? ""],
                }}
              />
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                aria-label={
                  flipped ? "Show the prompt" : "Show discussion points"
                }
                className={clsx(
                  "relative grid w-full text-left transition-transform duration-500 [transform-style:preserve-3d]",
                  flipped && "[transform:rotateY(180deg)]",
                )}
              >
                <Face>
                  <CardHead
                    card={card}
                    n={index + 1}
                    of={cards.length}
                    mark={marks[card.id]}
                  />
                  <p className="font-display mt-6 text-[22px] leading-snug font-semibold text-white sm:text-[26px]">
                    <Rich text={card.prompt} provider={provider} />
                  </p>
                  <p className="mt-auto flex items-center gap-1.5 pt-8 text-[12px] text-slate-500">
                    <MessageCircleQuestion size={14} /> Talk it through, then
                    tap to flip
                    <kbd className="ml-1 hidden rounded border border-white/15 px-1.5 font-mono text-[10px] sm:inline">
                      Space
                    </kbd>
                  </p>
                </Face>
                <Face back>
                  <CardHead
                    card={card}
                    n={index + 1}
                    of={cards.length}
                    mark={marks[card.id]}
                  />
                  <p className="mt-3 text-[13px] leading-snug text-slate-400">
                    <Rich text={card.prompt} provider={provider} />
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {card.points.map((p, i) => (
                      <li
                        key={i}
                        className="flex gap-2.5 text-[15px] leading-relaxed text-slate-100"
                      >
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-300" />
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
                </Face>
              </button>
            </div>

            {/* Controls */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={index === 0}
                aria-label="Previous card"
                className="grid size-11 place-items-center rounded-xl border border-white/10 text-slate-300 disabled:opacity-30"
              >
                <ArrowLeft size={18} />
              </button>
              {flipped ? (
                <>
                  <button
                    type="button"
                    onClick={() => mark("revisit")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-300/40 bg-amber-300/10 py-2.5 text-[14px] font-semibold text-amber-100"
                  >
                    <RotateCcw size={15} /> Revisit
                    <kbd className="ml-1 hidden font-mono text-[10px] opacity-60 sm:inline">
                      1
                    </kbd>
                  </button>
                  <button
                    type="button"
                    onClick={() => mark("got")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300/40 bg-emerald-300/10 py-2.5 text-[14px] font-semibold text-emerald-100"
                  >
                    <Check size={15} /> Got it
                    <kbd className="ml-1 hidden font-mono text-[10px] opacity-60 sm:inline">
                      2
                    </kbd>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setFlipped(true)}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-2.5 text-[14px] font-bold text-slate-950"
                >
                  Flip
                </button>
              )}
              <button
                type="button"
                onClick={() => go(1)}
                disabled={index >= cards.length - 1}
                aria-label="Next card"
                className="grid size-11 place-items-center rounded-xl border border-white/10 text-slate-300 disabled:opacity-30"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

/** Both faces share one grid cell, so the card is as tall as its taller face. */
function Face({
  back,
  children,
}: {
  back?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={clsx(
        "flex min-h-[22rem] flex-col rounded-3xl border p-6 shadow-2xl shadow-black/50 [backface-visibility:hidden] [grid-area:1/1]",
        back
          ? "[transform:rotateY(180deg)] border-cyan-300/20 bg-gradient-to-br from-slate-900 to-slate-950"
          : "border-white/10 bg-gradient-to-br from-slate-800/80 via-slate-900 to-indigo-950/80",
      )}
    >
      {children}
    </div>
  )
}

function CardHead({
  card,
  n,
  of,
  mark,
}: {
  card: DeckCard
  n: number
  of: number
  mark?: CardMark
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={clsx(
          "rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider uppercase",
          CATEGORY_TONE[card.category],
        )}
      >
        {CATEGORY_LABEL[card.category]}
      </span>
      <span className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
        {mark === "got" && <Check size={13} className="text-emerald-300" />}
        {mark === "revisit" && (
          <RotateCcw size={12} className="text-amber-300" />
        )}
        {n} / {of}
      </span>
    </div>
  )
}
