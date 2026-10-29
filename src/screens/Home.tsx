import clsx from "clsx"
import { InstallCard } from "~/ui/InstallCard"
import {
  Swords,
  Brain,
  Lock,
  Layers,
  BookOpen,
  ChevronDown,
  FlaskConical,
  GraduationCap,
  Hammer,
  Library,
  Shuffle,
  Siren,
  BrainCircuit,
  Split,
  Star,
  Stethoscope,
  Wrench,
} from "lucide-react"
import { useState } from "react"
import { DECKS } from "~/decks"
import { TOPICS } from "~/decks/topics"
import { TrophyRoom } from "~/ui/TrophyRoom"
import { DailyCard } from "~/ui/DailyCard"
import { dailyDate } from "~/game/daily"
import { useReview } from "~/game/points-store"
import { bestSurvivalWave, dueQueue } from "~/game/review"
import { isComplete, isUnlocked } from "~/game/progression"
import { loadOpenShelves, saveOpenShelves } from "~/game/storage"
import { SURVIVAL_REQUIRES } from "~/survival/engine"
import { missingPrereqs } from "~/game/progression"
import type { Progress } from "~/game/storage"
import { LEVELS, type Level } from "~/levels"
import type { ComponentKind } from "~/sim/types"
import { Block, ClientBlock } from "~/ui/Block"
import { iso } from "~/ui/iso"

/** A little diorama for the hero: users, a balancer, two tiers, a store, a queue. */
function Diorama() {
  const scene: { kind?: ComponentKind; x: number; y: number; n?: number }[] = [
    { x: 0, y: 1 },
    { kind: "load-balancer", x: 1, y: 1 },
    { kind: "app-server", x: 2, y: 0, n: 3 },
    { kind: "app-server", x: 2, y: 2, n: 4 },
    { kind: "cache", x: 3, y: 0 },
    { kind: "queue", x: 3, y: 2 },
    { kind: "sql-primary", x: 4, y: 1, n: 2 },
    { kind: "worker", x: 4, y: 3, n: 2 },
  ]
  const lines: [number, number, number, number, boolean][] = [
    [0, 1, 1, 1, false],
    [1, 1, 2, 0, false],
    [1, 1, 2, 2, false],
    [2, 0, 3, 0, false],
    [3, 0, 4, 1, false],
    [2, 2, 4, 1, false],
    [2, 2, 3, 2, true],
    [3, 2, 4, 3, true],
  ]
  return (
    <svg viewBox="-150 -60 360 230" className="w-full max-w-md" aria-hidden>
      {lines.map(([ax, ay, bx, by, async], i) => {
        const a = iso(ax, ay)
        const b = iso(bx, by)
        return (
          <line
            key={i}
            x1={a.sx}
            y1={a.sy}
            x2={b.sx}
            y2={b.sy}
            stroke={async ? "#fbbf24" : "#38bdf8"}
            strokeWidth={2}
            strokeDasharray={async ? "7 6" : "4 8"}
            className="march"
          />
        )
      })}
      {[...scene]
        .sort((a, b) => a.x + a.y - (b.x + b.y))
        .map((s, i) => {
          const p = iso(s.x, s.y)
          return (
            <g key={i} transform={`translate(${p.sx} ${p.sy})`}>
              <g className="float" style={{ animationDelay: `${i * 0.35}s` }}>
                {s.kind ? (
                  <Block kind={s.kind} instances={s.n ?? 1} />
                ) : (
                  <ClientBlock />
                )}
              </g>
            </g>
          )
        })}
    </svg>
  )
}

function LevelCard({
  level,
  index,
  stars,
  diagnosed,
  onPlay,
  onDeck,
  lockedBy,
}: {
  level: Level
  index: number
  stars: number
  diagnosed?: boolean
  onPlay: () => void
  onDeck: () => void
  /** Titles of unfinished prerequisites; empty when the level is open. */
  lockedBy: string[]
}) {
  const locked = lockedBy.length > 0
  return (
    <div className="relative flex">
      <button
        type="button"
        onClick={onPlay}
        disabled={locked}
        className={clsx(
          "group relative flex w-full flex-col rounded-2xl border p-4 pb-12 text-left transition",
          locked
            ? "cursor-not-allowed border-white/5 bg-white/[0.015] opacity-60"
            : "border-white/8 bg-gradient-to-b from-white/[0.05] to-white/[0.01] hover:-translate-y-0.5 hover:border-cyan-300/40 hover:shadow-[0_10px_40px_-15px] hover:shadow-cyan-400/40",
        )}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-slate-500">
            {level.track === "classic"
              ? "C"
              : level.track === "cap"
                ? "P"
                : level.track === "ops"
                  ? "O"
                  : level.track === "ai"
                    ? "A"
                    : level.mode === "build"
                      ? "B"
                      : "R"}
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex gap-0.5" aria-label={`${stars} of 3 stars`}>
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                size={14}
                className={
                  n <= stars
                    ? "fill-amber-300 text-amber-300"
                    : "text-slate-700"
                }
              />
            ))}
          </span>
        </div>
        <h3 className="font-display mt-2 text-[17px] font-bold text-white group-hover:text-cyan-100">
          {level.title}
        </h3>
        <p className="mt-1 text-[13px] leading-snug text-slate-400">
          {level.tagline}
        </p>
        {locked && (
          <span className="mt-2 flex items-center gap-1 text-[12px] text-slate-400">
            <Lock size={12} /> Finish {lockedBy.join(" and ")} to unlock
          </span>
        )}
        {diagnosed && (
          <span className="mt-2 flex items-center gap-1 text-[11px] text-emerald-300">
            <Stethoscope size={12} /> Diagnosed first try
          </span>
        )}
      </button>
      {/* A sibling, not a child: a button can't nest inside a button. */}
      <button
        type="button"
        onClick={onDeck}
        className="absolute bottom-3 left-4 flex items-center gap-1 rounded-full border border-fuchsia-300/25 px-2.5 py-1 text-[11px] text-fuchsia-200/90 hover:border-fuchsia-300/60 hover:text-fuchsia-100"
      >
        <Layers size={12} /> Discussion deck · {DECKS[level.id]?.length ?? 0}
      </button>
    </div>
  )
}

export function Home({
  progress,
  onPlay,
  onSandbox,
  onCodex,
  onDeck,
  onRetention,
  onSurvival,
  onDaily,
}: {
  progress: Progress
  onPlay: (id: string) => void
  onSandbox: () => void
  onCodex: () => void
  onDeck: (id: string) => void
  onRetention: () => void
  onSurvival: () => void
  onDaily: () => void
}) {
  const build = LEVELS.filter((l) => l.mode === "build" && !l.track)
  const classics = LEVELS.filter((l) => l.track === "classic")
  const cap = LEVELS.filter((l) => l.track === "cap")
  const ops = LEVELS.filter((l) => l.track === "ops")
  const ai = LEVELS.filter((l) => l.track === "ai")
  const repair = LEVELS.filter((l) => l.mode === "repair")
  const total = LEVELS.reduce((s, l) => s + (progress[l.id]?.stars ?? 0), 0)
  const started = build[0] !== undefined && isComplete(build[0].id, progress)
  const shelf = (
    id: string,
    title: string,
    icon: React.ReactNode,
    blurb: string,
    levels: Level[],
    accent: string,
  ) => {
    const earned = levels.reduce((n, l) => n + (progress[l.id]?.stars ?? 0), 0)
    return (
      <Shelf
        id={id}
        title={title}
        icon={icon}
        blurb={blurb}
        accent={accent}
        summary={`★ ${earned} / ${levels.length * 3}`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map((l, i) => (
            <LevelCard
              key={l.id}
              level={l}
              index={i}
              stars={progress[l.id]?.stars ?? 0}
              diagnosed={progress[l.id]?.diagnosedFirstTry}
              onPlay={() => onPlay(l.id)}
              onDeck={() => onDeck(l.id)}
              lockedBy={missingPrereqs(l, progress)}
            />
          ))}
        </div>
      </Shelf>
    )
  }
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <div className="grid items-center gap-6 md:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="font-mono text-[11px] tracking-[0.25em] text-cyan-300/80 uppercase">
            A system design game
          </p>
          <h1 className="font-display mt-2 text-6xl leading-[0.95] font-bold tracking-tight text-white sm:text-7xl">
            Archi
            <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400 bg-clip-text text-transparent">
              tech
            </span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-300">
            Draw an architecture, then throw traffic at it. Watch packets flow,
            servers glow red and zones go dark, and learn why the textbook
            answer is the textbook answer.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                // After the first level, any level you can open, from any shelf.
                const open = started
                  ? LEVELS.filter((l) => isUnlocked(l, progress))
                  : []
                const pick = open[Math.floor(Math.random() * open.length)]
                onPlay(pick?.id ?? build[0]?.id ?? "")
              }}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-300 px-4 py-2.5 text-[14px] font-bold text-slate-950 shadow-[0_0_30px_-6px] shadow-cyan-300/70"
            >
              {started ? (
                <>
                  <Shuffle size={15} /> Build random
                </>
              ) : (
                "Start building"
              )}
            </button>
            <button
              type="button"
              onClick={onSandbox}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-[14px] text-slate-200 hover:border-white/30"
            >
              <FlaskConical size={15} /> Sandbox
            </button>
            <button
              type="button"
              onClick={onCodex}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-[14px] text-slate-200 hover:border-white/30"
            >
              <BookOpen size={15} /> Codex
            </button>
            <RetainButton onOpen={onRetention} />
          </div>
          {total > 0 && (
            <p className="mt-3 flex items-center gap-1.5 font-mono text-[12px] text-amber-200/80">
              <Star size={13} className="fill-amber-300 text-amber-300" />{" "}
              {total} / {LEVELS.length * 3}
            </p>
          )}
        </div>
        <div className="flex justify-center">
          <Diorama />
        </div>
      </div>
      {/* After the first level: the daily can land on any level. */}
      {started && (
        <div className="mt-6">
          <DailyCard date={dailyDate(new Date())} onPlay={onDaily} />
        </div>
      )}
      <div className="mt-4 max-w-md">
        <InstallCard />
      </div>

      {shelf(
        "build",
        "Build",
        <Hammer size={22} />,
        "You get a brief and a palette. Design something that meets the targets, then survive the chaos round.",
        build,
        "text-cyan-200",
      )}
      {shelf(
        "repair",
        "Repair",
        <Wrench size={22} />,
        "You inherit somebody else's production system and it's on fire. Load test it, diagnose the root cause, then fix it.",
        repair,
        "text-rose-200",
      )}
      {shelf(
        "classics",
        "Classics",
        <GraduationCap size={22} />,
        "The questions interviewers ask most: a URL shortener, a chat app, a ticket sale and more. Each one hides the mistake that question is designed to catch.",
        classics,
        "text-violet-200",
      )}
      {shelf(
        "cap",
        "CAP trade-offs",
        <Split size={22} />,
        "When a network split leaves copies of your data apart, do you refuse requests or let the copies disagree? Choose per store, then shard the data by a partition key that spreads the load.",
        cap,
        "text-indigo-200",
      )}
      {shelf(
        "ops",
        "Production incidents",
        <Siren size={22} />,
        "The failures a load test never shows: a partner that slows to a crawl, a message that fails forever, a login flood, a bad migration, a worker that hangs without crashing. Only the production settings in each component's sidebar get you through.",
        ops,
        "text-lime-200",
      )}
      {shelf(
        "ai",
        "AI systems",
        <BrainCircuit size={22} />,
        "Systems built around a hosted model: a chatbot over the company's documents, a gateway many teams share, a job that tags a day's tickets overnight. The model is most of the bill and most of the wait, and its quota is counted in tokens.",
        ai,
        "text-fuchsia-200",
      )}
      <FundamentalsSection onDeck={onDeck} />
      <SurvivalSection progress={progress} onOpen={onSurvival} />
      <TrophyRoom progress={progress} />
    </main>
  )
}

/**
 * A home-page section that opens and closes from its header. Closed by
 * default, so the page starts as a short list; which ones are open is
 * remembered on this device.
 */
function Shelf({
  id,
  title,
  icon,
  blurb,
  accent,
  summary,
  children,
}: {
  id: string
  title: string
  icon: React.ReactNode
  blurb: string
  accent: string
  /** A few words shown in the header either way: stars earned, cards due. */
  summary?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(() => loadOpenShelves().includes(id))
  const toggle = () => {
    const next = !open
    setOpen(next)
    const others = loadOpenShelves().filter((x) => x !== id)
    saveOpenShelves(next ? [...others, id] : others)
  }
  const panel = `shelf-${id}`
  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panel}
        className="group flex w-full items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.04] sm:px-5"
      >
        <span className="min-w-0 flex-1">
          <span
            className={clsx(
              "font-display flex items-center gap-2 text-2xl font-bold",
              accent,
            )}
          >
            {icon} {title}
          </span>
          {/* Folded shelves show just their names: the list stays short. */}
          {open && (
            <span className="mt-1 block max-w-xl text-[14px] text-slate-400">
              {blurb}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2 pt-1.5">
          {summary && (
            <span className="hidden font-mono text-[12px] text-slate-400 sm:inline">
              {summary}
            </span>
          )}
          <ChevronDown
            size={20}
            className={clsx(
              "text-slate-400 transition group-hover:text-white",
              open && "rotate-180",
            )}
          />
        </span>
      </button>
      {summary && (
        <p className="mt-1.5 px-4 font-mono text-[12px] text-slate-500 sm:hidden">
          {summary}
        </p>
      )}
      <div id={panel} hidden={!open} className="mt-4">
        {children}
      </div>
    </section>
  )
}

/** Arcade mode: one architecture against endless, growing waves. */
function SurvivalSection({
  progress,
  onOpen,
}: {
  progress: Progress
  onOpen: () => void
}) {
  const state = useReview()
  const best = bestSurvivalWave(state)
  const missing = SURVIVAL_REQUIRES.filter(
    (id) => !isComplete(id, progress),
  ).flatMap((id) => LEVELS.find((l) => l.id === id)?.title ?? [])
  const locked = missing.length > 0
  return (
    <Shelf
      id="survival"
      title="Survival"
      icon={<Swords size={22} />}
      accent="text-orange-200"
      blurb="Keep one architecture alive while traffic grows every wave. Some waves are all reads, some are checkout rushes, some are floods of slow jobs. From wave 3, something breaks that you won't see coming, and the business starts asking for things more servers can't give it. Two lives."
      summary={best ? `Best: wave ${best}` : locked ? "Locked" : "No runs yet"}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={locked}
        className={clsx(
          "flex w-full items-center justify-between gap-4 rounded-2xl border p-5 text-left transition",
          locked
            ? "cursor-not-allowed border-white/5 opacity-60"
            : "border-orange-300/30 bg-gradient-to-r from-orange-400/[0.1] via-rose-500/[0.06] to-transparent hover:border-orange-300/60",
        )}
      >
        <span>
          <span className="font-display block text-[28px] leading-none font-bold text-white">
            {best ? `Wave ${best}` : "No runs yet"}
            {best > 0 && (
              <span className="ml-2 text-[15px] font-semibold text-orange-200">
                best
              </span>
            )}
          </span>
          <span className="mt-1.5 block text-[13px] text-slate-400">
            {locked
              ? `Finish ${missing.join(" and ")} to unlock.`
              : "10 points for every new wave you clear."}
          </span>
        </span>
        <span className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 px-4 py-2 text-[14px] font-bold text-slate-950">
          {locked ? <Lock size={14} /> : <Swords size={14} />}
          {locked ? "Locked" : "Play"}
        </span>
      </button>
    </Shelf>
  )
}

/** Discussion decks that aren't tied to a scenario. Always unlocked. */
function FundamentalsSection({ onDeck }: { onDeck: (id: string) => void }) {
  const practised = (id: string) =>
    LEVELS.filter((l) => l.topics?.includes(id)).length
  return (
    <Shelf
      id="fundamentals"
      title="Fundamentals"
      icon={<Library size={22} />}
      accent="text-sky-200"
      blurb="What interviews ask about beyond any one design: storage engines, transactions, consensus, estimation, the interview itself. Answer out loud, flip, and mark what you knew."
      summary={`${TOPICS.length} decks`}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onDeck(t.id)}
            className="flex flex-col rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-300/40"
          >
            <span className="font-display text-[17px] font-bold text-white">
              {t.title}
            </span>
            <span className="mt-1 text-[13px] leading-snug text-slate-400">
              {t.blurb}
            </span>
            <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] text-sky-200/80">
              <Layers size={12} /> {t.cards.length} cards
              {practised(t.id) > 0 && (
                <span className="text-slate-500">
                  · {practised(t.id)} scenario
                  {practised(t.id) === 1 ? "" : "s"} to practise
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </Shelf>
  )
}

/** The third mode: revising what you've already met, with what's due now. */
function RetainButton({ onOpen }: { onOpen: () => void }) {
  const state = useReview()
  // "Now" is fixed for the visit; reopening the page refreshes it.
  const [now] = useState(() => Date.now())
  const due = dueQueue(state, now, Infinity).length
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Retain, ${due} to revise`}
      title="Revise what you've already met. Ones you missed come back worth double."
      className="flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-[14px] text-slate-200 hover:border-white/30"
    >
      <Brain size={15} /> Retain ({due})
    </button>
  )
}
