import clsx from "clsx"
import { BoardActions } from "~/ui/BoardActions"
import {
  Activity,
  ChevronLeft,
  Hammer,
  Heart,
  Play as PlayIcon,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Skull,
  Swords,
  Trophy,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { getReview, updateReview } from "~/game/points-store"
import { bestSurvivalWave, clearSurvivalWave } from "~/game/review"
import { setHum, sfx, stopHum } from "~/game/sound"
import { useBoardEditor } from "~/game/useBoardEditor"
import { useWide } from "~/game/useWide"
import { COMPONENT_CARDS } from "~/levels/concepts"
import type { Provider } from "~/providers/names"
import { findings } from "~/sim/findings"
import { simulate } from "~/sim/simulate"
import type { ComponentKind } from "~/sim/types"
import {
  LIVES,
  MIX,
  SURVIVAL_PALETTE,
  waveCost,
  canLaunch,
  playWave,
  wave as makeWave,
  type WaveOutcome,
} from "~/survival/engine"
import { Board } from "~/ui/Board"
import { CardView } from "~/ui/CardView"
import { Confetti } from "~/ui/Confetti"
import { ms, pct, rps, usd } from "~/ui/format"
import { Modal } from "~/ui/Modal"
import { FindingList, H, InspectPanel, PalettePanel } from "~/ui/panels"

type Phase = "build" | "ramp" | "incident" | "report" | "over"

const newSeed = () => Math.floor(Math.random() * 1_000_000)

/**
 * Survival: keep one architecture alive through endless waves. Traffic grows
 * about 30% a wave, the mix changes, and from wave 3 something goes wrong
 * that you don't see coming. Three lives; the budget grows as you go.
 */
export function Survival({
  provider,
  onBack,
  toggle,
}: {
  provider: Provider
  onBack: () => void
  toggle: React.ReactNode
}) {
  const wide = useWide()
  const [seed, setSeed] = useState(newSeed)
  const [n, setN] = useState(1)
  const [lives, setLives] = useState(LIVES)
  const [phase, setPhase] = useState<Phase>("build")
  const [traffic, setTraffic] = useState(0)
  const [shake, setShake] = useState(false)
  const [outcome, setOutcome] = useState<WaveOutcome | null>(null)
  const [newBest, setNewBest] = useState(false)
  const [tab, setTab] = useState<"wave" | "build" | "inspect">("wave")
  const [info, setInfo] = useState<ComponentKind | null>(null)
  const [best, setBest] = useState(() => bestSurvivalWave(getReview()))
  // The best before this run, so game over can tell whether it was beaten.
  const [bestAtStart, setBestAtStart] = useState(best)
  const [cleared, setCleared] = useState(0)
  const running = phase === "ramp" || phase === "incident"

  const editor = useBoardEditor({
    initial: { components: [], edges: [] },
    provider,
    running,
    onInspect: () => {
      if (!wide) setTab("inspect")
    },
    onPlaced: () => {
      if (!wide) setTab("build")
    },
  })
  const { graph } = editor

  const w = useMemo(() => makeWave(seed, n), [seed, n])
  const cost = waveCost(graph, w)
  const affordable = canLaunch(graph, w)
  const live = phase !== "build" && phase !== "over"
  const incidentFaults = useMemo(
    () => w.incidents.flatMap((i) => i.faults),
    [w],
  )
  const result = useMemo(
    () =>
      simulate(
        graph,
        { ...w.load, peakRps: w.load.peakRps * Math.max(traffic, 0.0001) },
        phase === "incident" ? incidentFaults : [],
      ),
    [graph, w, traffic, phase, incidentFaults],
  )

  // --- the wave ------------------------------------------------------------
  const raf = useRef(0)
  const timers = useRef<number[]>([])
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current)
      timers.current.forEach(clearTimeout)
      stopHum()
    },
    [],
  )

  const launch = () => {
    if (!affordable || running) return
    editor.setTool({ t: "select" })
    setPhase("ramp")
    sfx.click()
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 2200)
      const share = 0.1 + 0.9 * (1 - Math.pow(1 - t, 2))
      setTraffic(share)
      setHum(share)
      if (t < 1) {
        raf.current = requestAnimationFrame(step)
        return
      }
      const finish = () => {
        stopHum()
        const o = playWave(graph, w)
        setOutcome(o)
        setPhase("report")
        if (o.survived) {
          sfx.coin()
          const before = bestSurvivalWave(getReview())
          updateReview((s) => clearSurvivalWave(s, n))
          setCleared((c) => c + 1)
          setNewBest(n > before)
          setBest(Math.max(before, n))
        } else {
          sfx.fail()
          setLives((l) => l - 1)
        }
      }
      if (w.incidents.length === 0) {
        timers.current.push(window.setTimeout(finish, 700))
        return
      }
      timers.current.push(
        window.setTimeout(() => {
          setPhase("incident")
          sfx.siren()
          setHum(1.4)
          setShake(true)
          timers.current.push(window.setTimeout(() => setShake(false), 650))
          timers.current.push(window.setTimeout(finish, 1900))
        }, 500),
      )
    }
    raf.current = requestAnimationFrame(step)
  }

  const nextWave = () => {
    if (lives <= 0) {
      setPhase("over")
      return
    }
    setN((x) => x + 1)
    setPhase("build")
    setTraffic(0)
    setOutcome(null)
    setNewBest(false)
  }

  const restart = () => {
    editor.dispatch({ type: "reset", graph: { components: [], edges: [] } })
    setSeed(newSeed())
    setBestAtStart(best)
    setCleared(0)
    setN(1)
    setLives(LIVES)
    setPhase("build")
    setTraffic(0)
    setOutcome(null)
  }

  // --- panels --------------------------------------------------------------
  const waveCard = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-orange-300/80 uppercase">
            Wave {n}
          </p>
          <h2 className="font-display text-xl font-bold text-white">
            {MIX[w.mix].label}
          </h2>
        </div>
        <div className="flex gap-0.5" aria-label={`${lives} lives`}>
          {Array.from({ length: LIVES }, (_, i) => (
            <Heart
              key={i}
              size={18}
              className={
                i < lives ? "fill-rose-400 text-rose-400" : "text-slate-700"
              }
            />
          ))}
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-slate-300">
        {rps(w.load.peakRps)} at peak. {MIX[w.mix].blurb}
      </p>
      <div>
        <div className="flex justify-between font-mono text-[11px]">
          <span className="text-slate-500">Monthly cost</span>
          <span className={affordable ? "text-slate-200" : "text-rose-300"}>
            {usd(cost)} / {usd(w.budget)}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className={clsx(
              "h-full rounded-full transition-all",
              affordable ? "bg-emerald-400" : "bg-rose-400",
            )}
            style={{ width: `${Math.min(100, (cost / w.budget) * 100)}%` }}
          />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-[12px] text-amber-200/90">
        <ShieldAlert size={13} />
        {n < 3
          ? "No incidents yet. Enjoy it."
          : `${n < 7 ? "One" : "Two"} unknown incident${n < 7 ? "" : "s"} will hit this wave.`}
      </p>
      <button
        type="button"
        onClick={launch}
        disabled={!affordable || running || !graph.edges.length}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 py-3 text-[15px] font-bold text-slate-950 shadow-[0_0_30px_-6px] shadow-rose-500/60 disabled:opacity-40"
      >
        {running ? (
          <>
            <Activity size={17} className="animate-pulse" /> Wave {n} incoming…
          </>
        ) : (
          <>
            <PlayIcon size={17} /> Launch wave {n}
          </>
        )}
      </button>
      {!affordable && (
        <p className="text-[12px] text-rose-300">
          Over budget: remove or shrink something first.
        </p>
      )}
      <p className="font-mono text-[11px] text-slate-500">
        Best: wave {best || "-"} · each new wave cleared is worth 10 points
      </p>
    </div>
  )

  const palette = (
    <PalettePanel
      palette={SURVIVAL_PALETTE}
      provider={provider}
      placing={editor.tool.t === "place" ? editor.tool.kind : undefined}
      onPick={(k) => {
        editor.setTool(k ? { t: "place", kind: k } : { t: "select" })
      }}
      onInfo={(k) => setInfo(k)}
    />
  )

  const inspect = (
    <InspectPanel
      graph={graph}
      provider={provider}
      selectedId={editor.sel.node}
      selectedEdgeId={editor.sel.edge}
      result={result}
      live={live}
      connecting={editor.tool.t === "connect"}
      onConnect={(id) =>
        editor.setTool(
          editor.tool.t === "connect"
            ? { t: "select" }
            : { t: "connect", from: id },
        )
      }
      onSet={(id, v) => editor.dispatch({ type: "set", id, ...v })}
      onRemove={(id) => {
        editor.dispatch({ type: "remove", id })
        editor.setSel({})
      }}
      onRemoveEdge={(id) => {
        editor.dispatch({ type: "remove-edge", id })
        editor.setSel({})
      }}
      onLearn={(k) => setInfo(k)}
    />
  )

  const board = (
    <div className={clsx("relative min-h-0 flex-1", shake && "shake")}>
      {phase === "incident" && (
        <div className="chaos-vignette pointer-events-none absolute inset-0 z-10" />
      )}
      <Board
        graph={graph}
        provider={provider}
        result={result}
        live={live}
        selectedId={editor.sel.node}
        selectedEdgeId={editor.sel.edge}
        placing={editor.tool.t === "place"}
        connectingFrom={
          editor.tool.t === "connect" ? editor.tool.from : undefined
        }
        onTapNode={editor.onTapNode}
        onTapEdge={editor.onTapEdge}
        onTapTile={editor.onTapTile}
        onMove={editor.onMove}
      />
      {!running && (
        <BoardActions
          node={editor.sel.node}
          edge={editor.sel.edge}
          connecting={editor.tool.t === "connect"}
          onConnect={(id) =>
            editor.setTool(
              editor.tool.t === "connect"
                ? { t: "select" }
                : { t: "connect", from: id },
            )
          }
          onRemove={(id) => {
            editor.dispatch({ type: "remove", id })
            editor.setSel({})
          }}
          onRemoveEdge={(id) => {
            editor.dispatch({ type: "remove-edge", id })
            editor.setSel({})
          }}
        />
      )}
      {editor.banner && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-cyan-300/40 bg-slate-950/85 py-1.5 pr-1.5 pl-4 text-[13px] text-cyan-100 backdrop-blur">
            {editor.banner}
            <button
              type="button"
              onClick={() => editor.setTool({ t: "select" })}
              aria-label="Cancel"
              className="rounded-full bg-white/10 p-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      {running && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <div
            className={clsx(
              "flex items-center gap-3 rounded-full border px-4 py-1.5 font-mono text-[12px] backdrop-blur",
              phase === "incident"
                ? "chaos-flash border-rose-400/60 bg-rose-950/80 text-rose-100"
                : "border-orange-300/30 bg-slate-950/80 text-orange-100",
            )}
          >
            <Activity size={14} className="animate-pulse" />
            {phase === "incident"
              ? w.incidents.map((i) => i.label).join(" + ")
              : `Wave ${n}: ${rps(w.load.peakRps * traffic)}`}
            <span className="text-slate-400">
              p99 {ms(result.p99Ms)} · err {pct(result.errorRate, 1)}
            </span>
          </div>
        </div>
      )}
    </div>
  )

  const header = (
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
      <span className="font-display flex items-center gap-1.5 text-[15px] font-bold text-orange-200">
        <Swords size={15} /> <span className="hidden sm:inline">Survival</span>
      </span>
      <div className="flex-1" />
      {toggle}
    </header>
  )

  const findingsShown = outcome
    ? findings(graph, w.load, outcome.hit).slice(0, 4)
    : []

  const modal =
    phase === "report" && outcome ? (
      <Modal onClose={nextWave}>
        {outcome.survived && (newBest || n % 5 === 0) && <Confetti />}
        <div className="text-center">
          <div
            className={clsx(
              "mx-auto grid size-14 place-items-center rounded-full",
              outcome.survived
                ? "bg-emerald-400/15 text-emerald-300"
                : "bg-rose-400/15 text-rose-300",
            )}
          >
            {outcome.survived ? <Trophy size={26} /> : <Skull size={26} />}
          </div>
          <h2 className="font-display mt-3 text-2xl font-bold text-white">
            {outcome.survived ? `Wave ${n} survived` : `Wave ${n} broke you`}
          </h2>
          <p className="mt-1 text-[14px] text-slate-300">
            {outcome.survived
              ? newBest
                ? "A new personal best: +10 points."
                : "Held up. The next one is bigger."
              : lives > 0
                ? `You lose a life. ${lives} left.`
                : "That was your last life."}
          </p>
          {w.incidents.length > 0 && (
            <p className="mt-2 text-[12px] text-amber-200/80">
              Incident: {w.incidents.map((i) => i.label).join(" + ")}
            </p>
          )}
        </div>
        {outcome.reasons.length > 0 && (
          <ul className="mt-4 space-y-1">
            {outcome.reasons.map((r) => (
              <li key={r} className="text-[13px] text-rose-200">
                • {r}
              </li>
            ))}
          </ul>
        )}
        {findingsShown.length > 0 && (
          <div className="mt-4">
            <H>What the test saw</H>
            <FindingList
              items={findingsShown}
              provider={provider}
              onConcept={() => {}}
            />
          </div>
        )}
        <button
          type="button"
          onClick={nextWave}
          className="mt-5 w-full rounded-xl bg-cyan-300 py-2.5 text-[14px] font-bold text-slate-950"
        >
          {lives > 0 ? `Build for wave ${n + 1}` : "See your score"}
        </button>
      </Modal>
    ) : phase === "over" ? (
      <Modal onClose={restart}>
        {best > bestAtStart && <Confetti />}
        <div className="text-center">
          <Skull size={30} className="mx-auto text-rose-300" />
          <h2 className="font-display mt-3 text-3xl font-bold text-white">
            Game over
          </h2>
          <p className="mt-1 text-[15px] text-slate-300">
            You reached wave {n} and cleared {cleared}.
          </p>
          {best > bestAtStart && (
            <p className="mt-1 text-[14px] font-semibold text-amber-200">
              New personal best!
            </p>
          )}
          <p className="mt-1 font-mono text-[12px] text-slate-500">
            Best ever: wave {best || "-"}
          </p>
          <button
            type="button"
            onClick={restart}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 py-2.5 text-[14px] font-bold text-slate-950"
          >
            <RotateCcw size={15} /> Play again
          </button>
        </div>
      </Modal>
    ) : info ? (
      <Modal onClose={() => setInfo(null)}>
        <CardView
          card={COMPONENT_CARDS[info]}
          provider={provider}
          kind={info}
        />
      </Modal>
    ) : null

  if (wide)
    return (
      <div className="flex h-dvh flex-col">
        {header}
        <div className="flex min-h-0 flex-1">
          <aside className="w-80 shrink-0 space-y-6 overflow-y-auto border-r border-white/5 bg-slate-950/40 p-4">
            {waveCard}
            {palette}
          </aside>
          {board}
          <aside className="w-80 shrink-0 overflow-y-auto border-l border-white/5 bg-slate-950/40 p-4">
            {inspect}
          </aside>
        </div>
        {modal}
      </div>
    )

  const tabs = [
    { id: "wave" as const, label: "Wave", icon: <Swords size={16} /> },
    { id: "build" as const, label: "Build", icon: <Hammer size={16} /> },
    {
      id: "inspect" as const,
      label: "Inspect",
      icon: <SlidersHorizontal size={16} />,
    },
  ]
  return (
    <div className="flex h-dvh flex-col">
      {header}
      {board}
      <div
        className="shrink-0 border-t border-white/10 bg-slate-950/90 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-h-[44dvh] overflow-y-auto px-4 pt-3 pb-2">
          {tab === "wave" && waveCard}
          {tab === "build" && palette}
          {tab === "inspect" && inspect}
        </div>
        <nav className="grid grid-cols-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex flex-col items-center gap-0.5 py-2 text-[11px]",
                tab === t.id ? "text-orange-300" : "text-slate-500",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      {modal}
    </div>
  )
}
