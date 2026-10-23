import clsx from "clsx"
import {
  BookOpen,
  Hammer,
  Activity,
  SlidersHorizontal,
  X,
  RotateCcw,
  Lightbulb,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import { canConnect, edit, inBounds, occupied } from "~/game/edit"
import { clearBuild, loadBuild, saveBuild, type Progress } from "~/game/storage"
import { useWide } from "~/game/useWide"
import { CONCEPTS, COMPONENT_CARDS, type ConceptId } from "~/levels/concepts"
import { LEVELS, type Level } from "~/levels"
import type { Provider } from "~/providers/names"
import { findings, symptomsOnly, type Finding } from "~/sim/findings"
import { grade as gradeBuild, type Grade } from "~/sim/grade"
import { simulate } from "~/sim/simulate"
import type { ComponentKind, Graph, LoadProfile } from "~/sim/types"
import { CLIENT_ID } from "~/sim/types"
import { plain } from "~/text"
import { Board } from "~/ui/Board"
import { CardView } from "~/ui/CardView"
import { DiscussView } from "~/ui/DiscussView"
import { SolutionView } from "~/ui/SolutionView"
import { SOLUTIONS } from "~/levels/solutions"
import { ms, pct } from "~/ui/format"
import { Modal } from "~/ui/Modal"
import {
  H,
  BriefPanel,
  DiagnoseBox,
  InspectPanel,
  PalettePanel,
  TestPanel,
  nameOf,
} from "~/ui/panels"
import { Results } from "~/ui/Results"

type Tool =
  | { t: "select" }
  | { t: "place"; kind: ComponentKind }
  | { t: "connect"; from: string }
  | { t: "diagnose" }

type Tab = "brief" | "build" | "inspect" | "test"
type Phase = "idle" | "ramp" | "hold" | "chaos"
type Info =
  | { concept: ConceptId }
  | { kind: ComponentKind }
  | { discuss: string }
  | { solution: true }

const EMPTY: Graph = { components: [], edges: [] }

export function Play({
  level,
  sandbox,
  provider,
  progress,
  onProgress,
  onExit,
  onNext,
  toggle,
}: {
  level: Level
  sandbox?: boolean
  provider: Provider
  progress: Progress
  onProgress: (p: Progress) => void
  onExit: () => void
  onNext: (id: string) => void
  toggle: React.ReactNode
}) {
  const wide = useWide()
  const initial = useMemo(
    () => loadBuild(level.id) ?? level.starter ?? EMPTY,
    [level],
  )
  const [graph, dispatch] = useReducer(edit, initial)
  const [tool, setTool] = useState<Tool>({ t: "select" })
  const [sel, setSel] = useState<{ node?: string; edge?: string }>({})
  const [traffic, setTraffic] = useState(1)
  const [live, setLive] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [graded, setGraded] = useState<Grade | null>(null)
  const [info, setInfo] = useState<Info | null>(null)
  const [tab, setTab] = useState<Tab>(
    level.mode === "repair" ? "brief" : "build",
  )
  const [sheetOpen, setSheetOpen] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [diag, setDiag] = useState({ attempts: 0, solved: false })
  const [load, setLoad] = useState<LoadProfile>(level.load)

  useEffect(() => saveBuild(level.id, graph), [graph, level.id])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const chaosOn = phase === "chaos"
  const liveLoad = useMemo(
    () => ({ ...load, peakRps: load.peakRps * traffic }),
    [load, traffic],
  )
  const result = useMemo(
    () => simulate(graph, liveLoad, chaosOn ? level.chaos.faults : []),
    [graph, liveLoad, chaosOn, level.chaos.faults],
  )
  // Repair mode hides the findings that would name the culprit until it's found.
  const spoilerFree = level.mode === "repair" && !diag.solved
  const reveal = (f: Finding[]) => (spoilerFree ? symptomsOnly(f) : f)
  const liveFindings = useMemo(() => {
    const f = findings(
      graph,
      liveLoad,
      result,
      sandbox ? undefined : level.targets,
    )
    return spoilerFree ? symptomsOnly(f) : f
  }, [graph, liveLoad, result, level.targets, sandbox, spoilerFree])

  // --- the graded run: ramp, hold at peak, then pull the chaos lever --------
  const raf = useRef(0)
  const run = useCallback(() => {
    setLive(true)
    setTool({ t: "select" })
    setPhase("ramp")
    if (!wide) setSheetOpen(false)
    const start = performance.now()
    const RAMP = 2600
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / RAMP)
      setTraffic(0.1 + 0.9 * (1 - Math.pow(1 - t, 2)))
      if (t < 1) raf.current = requestAnimationFrame(step)
      else {
        setPhase("hold")
        setTimeout(() => {
          setPhase("chaos")
          setTimeout(() => {
            const g = gradeBuild(
              graph,
              level.load,
              level.targets,
              level.chaos.faults,
            )
            setPhase("idle")
            setGraded(g)
            const prev = progress[level.id]
            onProgress({
              ...progress,
              [level.id]: {
                ...prev,
                stars: Math.max(prev?.stars ?? 0, g.stars),
              },
            })
          }, 2200)
        }, 1100)
      }
    }
    raf.current = requestAnimationFrame(step)
  }, [graph, level, progress, onProgress, wide])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const running = phase !== "idle"
  const phaseLabel =
    phase === "ramp"
      ? "Ramping traffic…"
      : phase === "hold"
        ? "Holding at peak…"
        : "Chaos!"

  // --- board interactions --------------------------------------------------
  const openTab = (t: Tab) => {
    setTab(t)
    setSheetOpen(true)
  }

  // Keyboard, desktop: C connects from the selected block, D (or Delete)
  // removes the selected block or connection, Esc cancels. Subscribed once,
  // reading current state through a ref, like Modal.
  const keyState = useRef({ sel, running })
  useEffect(() => {
    keyState.current = { sel, running }
  }, [sel, running])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t?.closest("input, textarea, select, [contenteditable]")) return
      // A popup owns the keyboard: D must never delete something behind it.
      if (document.querySelector('[role="dialog"]')) return
      const { sel, running } = keyState.current
      if (e.key === "Escape") {
        setTool((cur) => (cur.t === "select" ? cur : { t: "select" }))
        return
      }
      if (running) return
      const key = e.key.toLowerCase()
      if (key === "c" && sel.node) {
        e.preventDefault()
        const from = sel.node
        setTool((cur) =>
          cur.t === "connect" ? { t: "select" } : { t: "connect", from },
        )
      } else if (key === "d" || key === "delete" || key === "backspace") {
        if (sel.edge) dispatch({ type: "remove-edge", id: sel.edge })
        else if (sel.node && sel.node !== CLIENT_ID)
          dispatch({ type: "remove", id: sel.node })
        else return
        e.preventDefault()
        setSel({})
        setTool({ t: "select" })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const onTapNode = (id: string) => {
    if (running) return
    if (tool.t === "connect") {
      if (canConnect(graph, tool.from, id)) {
        dispatch({ type: "connect", from: tool.from, to: id })
        setSel({ node: id })
      } else if (id !== tool.from) {
        setToast(
          "Those two are already connected, or that isn't a valid target.",
        )
      }
      setTool({ t: "select" })
      if (!wide) openTab("inspect")
      return
    }
    if (tool.t === "diagnose" && level.rootCause) {
      if (id === CLIENT_ID) return
      if (id === level.rootCause.componentId) {
        setDiag((d) => ({ ...d, solved: true }))
        const prev = progress[level.id]
        if (!prev?.diagnosedFirstTry)
          onProgress({
            ...progress,
            [level.id]: {
              stars: prev?.stars ?? 0,
              diagnosedFirstTry: diag.attempts === 0,
            },
          })
        openTab("brief")
      } else {
        setDiag((d) => ({ ...d, attempts: d.attempts + 1 }))
        setToast(
          `Not the root cause. ${nameOf(graph, id, provider)} may be suffering, but something else is making it suffer.`,
        )
      }
      setTool({ t: "select" })
      return
    }
    setSel({ node: id })
    if (!wide) openTab("inspect")
  }

  const onTapTile = (x: number, y: number) => {
    if (running) return
    if (tool.t === "place") {
      if (!inBounds(x, y) || occupied(graph, x, y)) return
      dispatch({ type: "place", kind: tool.kind, x, y })
      // Mirror the reducer's naming so the new block arrives selected.
      setSel({ node: `${tool.kind}-${nextNum(graph, tool.kind)}` })
      setTool({ t: "select" })
      if (!wide) openTab("inspect")
      return
    }
    if (tool.t !== "select") setTool({ t: "select" })
    setSel({})
  }

  // Reset throws away the player's build, so it takes a second tap.
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    if (!confirmReset) return
    const t = setTimeout(() => setConfirmReset(false), 3000)
    return () => clearTimeout(t)
  }, [confirmReset])
  const reset = () => {
    if (running) return
    if (!confirmReset) return setConfirmReset(true)
    setConfirmReset(false)
    setTool({ t: "select" })
    clearBuild(level.id)
    dispatch({ type: "reset", graph: level.starter ?? EMPTY })
    setSel({})
    setLive(false)
  }

  // --- panels --------------------------------------------------------------
  const brief = (
    <BriefPanel
      level={level}
      provider={provider}
      onConcept={(c) => setInfo({ concept: c })}
      diagnose={
        level.mode === "repair" ? (
          <DiagnoseBox
            level={level}
            provider={provider}
            active={tool.t === "diagnose"}
            solved={diag.solved}
            attempts={diag.attempts}
            onToggle={() => {
              setTool(
                tool.t === "diagnose" ? { t: "select" } : { t: "diagnose" },
              )
              if (!wide) setSheetOpen(false)
            }}
          />
        ) : undefined
      }
    />
  )
  const sandboxBrief = (
    <div className="space-y-2">
      <h2 className="font-display text-xl font-bold text-white">Sandbox</h2>
      <p className="text-[14px] leading-relaxed text-slate-300">
        Every component, no targets. Shape the workload below, build anything,
        and watch where it breaks.
      </p>
    </div>
  )
  const palette = (
    <PalettePanel
      palette={level.palette}
      provider={provider}
      placing={tool.t === "place" ? tool.kind : undefined}
      onPick={(k) => {
        setTool(k ? { t: "place", kind: k } : { t: "select" })
        if (k && !wide) setSheetOpen(false)
      }}
      onInfo={(kind) => setInfo({ kind })}
    />
  )
  const solution =
    sandbox || !SOLUTIONS[level.id] ? null : (
      <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3">
        <H>Stuck?</H>
        <button
          type="button"
          onClick={() => setInfo({ solution: true })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300/40 py-2 text-[14px] font-semibold text-amber-100 hover:bg-amber-300/10"
        >
          <Lightbulb size={15} /> See suggested solution
        </button>
        <p className="mt-2 text-[12px] leading-snug text-slate-500">
          Shows a three-star design, running, with the reasoning and trade-offs
          written out. It gives the answer away.
        </p>
      </div>
    )
  const inspect = (
    <InspectPanel
      graph={graph}
      provider={provider}
      selectedId={sel.node}
      selectedEdgeId={sel.edge}
      result={result}
      live={live}
      connecting={tool.t === "connect"}
      onConnect={(id) => {
        setTool(
          tool.t === "connect" ? { t: "select" } : { t: "connect", from: id },
        )
        if (!wide) setSheetOpen(false)
      }}
      onSet={(id, v) => dispatch({ type: "set", id, ...v })}
      onRemove={(id) => {
        dispatch({ type: "remove", id })
        setSel({})
      }}
      onRemoveEdge={(id) => {
        dispatch({ type: "remove-edge", id })
        setSel({})
      }}
      onLearn={(kind) => setInfo({ kind })}
      onDiscuss={(id) => setInfo({ discuss: id })}
    />
  )
  const test = (
    <TestPanel
      result={result}
      traffic={traffic}
      setTraffic={setTraffic}
      live={live}
      setLive={setLive}
      peakRps={load.peakRps}
      targets={sandbox ? undefined : level.targets}
      provider={provider}
      liveFindings={liveFindings}
      running={running}
      phase={phaseLabel}
      onRun={run}
      onConcept={(c) => setInfo({ concept: c })}
      sandbox={
        sandbox ? <SandboxLoad load={load} setLoad={setLoad} /> : undefined
      }
    />
  )

  const banner =
    tool.t === "place"
      ? `Tap an empty tile to place ${plain(`{${tool.kind}}`, provider)}`
      : tool.t === "connect"
        ? `Tap where requests from ${tool.from === CLIENT_ID ? "Users" : nameOf(graph, tool.from, provider)} should go`
        : tool.t === "diagnose"
          ? "Tap the component that is the root cause"
          : null

  const idx = LEVELS.findIndex((l) => l.id === level.id)
  const next = LEVELS[idx + 1]

  const board = (
    <div className="relative min-h-0 flex-1">
      <Board
        graph={graph}
        provider={provider}
        result={result}
        live={live}
        selectedId={sel.node}
        selectedEdgeId={sel.edge}
        placing={tool.t === "place"}
        connectingFrom={tool.t === "connect" ? tool.from : undefined}
        onTapNode={onTapNode}
        onTapEdge={(id) => {
          if (running) return
          setSel({ edge: id })
          setTool({ t: "select" })
          if (!wide) openTab("inspect")
        }}
        onTapTile={onTapTile}
        onMove={(id, x, y) => !running && dispatch({ type: "move", id, x, y })}
      />
      {banner && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-cyan-300/40 bg-slate-950/85 py-1.5 pr-1.5 pl-4 text-[13px] text-cyan-100 shadow-lg shadow-cyan-500/10 backdrop-blur">
            {banner}
            <button
              type="button"
              onClick={() => setTool({ t: "select" })}
              aria-label="Cancel"
              className="rounded-full bg-white/10 p-1 hover:bg-white/20"
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
              chaosOn
                ? "chaos-flash border-rose-400/60 bg-rose-950/80 text-rose-100"
                : "border-cyan-300/30 bg-slate-950/80 text-cyan-100",
            )}
          >
            <Activity size={14} className="animate-pulse" />
            {chaosOn ? level.chaos.label : phaseLabel}
            <span className="text-slate-400">
              p99 {ms(result.p99Ms)} · err {pct(result.errorRate, 1)}
            </span>
          </div>
        </div>
      )}
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 flex justify-center px-4">
          <div className="pop max-w-sm rounded-xl border border-white/10 bg-slate-900/95 px-4 py-2.5 text-center text-[13px] text-slate-100 shadow-xl">
            {toast}
          </div>
        </div>
      )}
    </div>
  )

  const header = (
    <header
      className="flex shrink-0 items-center gap-2 border-b border-white/5 bg-slate-950/60 px-3 pb-2 backdrop-blur"
      // The page is a fixed 100dvh, so the notch inset goes inside the header
      // rather than on the root, where it would push the tab bar off screen.
      style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <button
        type="button"
        onClick={onExit}
        className="font-display rounded-lg px-2 py-1 text-[15px] font-bold tracking-tight text-white hover:bg-white/5"
      >
        <span className="text-cyan-300">◆</span> Architech
      </button>
      <span className="hidden truncate text-[13px] text-slate-500 sm:inline">
        / {sandbox ? "Sandbox" : level.title}
      </span>
      <div className="flex-1" />
      {toggle}
      <button
        type="button"
        onClick={reset}
        className={clsx(
          "flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] whitespace-nowrap",
          confirmReset
            ? "bg-rose-400/15 text-rose-200"
            : "text-slate-400 hover:bg-white/5 hover:text-white",
        )}
        title={
          level.starter
            ? "Restore the original architecture"
            : "Clear the board"
        }
      >
        <RotateCcw size={13} />{" "}
        {confirmReset ? (
          "Tap again"
        ) : (
          <span className="hidden sm:inline">Reset</span>
        )}
      </button>
    </header>
  )

  const modal = graded ? (
    <Results
      grade={graded}
      level={level}
      provider={provider}
      findings={reveal(
        findings(
          graph,
          level.load,
          graded.peak,
          level.targets,
          graded.chaos,
          level.chaos.label,
        ),
      )}
      onClose={() => setGraded(null)}
      onNext={next ? () => onNext(next.id) : undefined}
      onConcept={(c) => setInfo({ concept: c })}
    />
  ) : info ? (
    <Modal
      onClose={() => setInfo(null)}
      wide={"solution" in info ? "xl" : false}
    >
      {"concept" in info ? (
        <CardView card={CONCEPTS[info.concept]} provider={provider} />
      ) : "solution" in info ? (
        <SolutionView level={level} provider={provider} />
      ) : "discuss" in info ? (
        <DiscussView
          graph={graph}
          id={info.discuss}
          scenario={level.scenario}
          load={liveLoad}
          result={live ? result : simulate(graph, load)}
          live={live}
          provider={provider}
          hideCaution={spoilerFree}
        />
      ) : (
        <CardView
          card={COMPONENT_CARDS[info.kind]}
          provider={provider}
          kind={info.kind}
        />
      )}
    </Modal>
  ) : null

  if (wide) {
    return (
      <div className="flex h-dvh flex-col">
        {header}
        <div className="flex min-h-0 flex-1">
          <aside className="w-80 shrink-0 space-y-6 overflow-y-auto border-r border-white/5 bg-slate-950/40 p-4">
            {sandbox ? sandboxBrief : brief}
            {palette}
            {solution}
          </aside>
          {board}
          <aside className="w-80 shrink-0 space-y-6 overflow-y-auto border-l border-white/5 bg-slate-950/40 p-4">
            {inspect}
            <hr className="border-white/5" />
            {test}
          </aside>
        </div>
        {modal}
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "brief", label: "Brief", icon: <BookOpen size={16} /> },
    { id: "build", label: "Build", icon: <Hammer size={16} /> },
    { id: "inspect", label: "Inspect", icon: <SlidersHorizontal size={16} /> },
    { id: "test", label: "Test", icon: <Activity size={16} /> },
  ]
  return (
    <div className="flex h-dvh flex-col">
      {header}
      {board}
      <div
        className="shrink-0 border-t border-white/10 bg-slate-950/90 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {sheetOpen && (
          <div className="max-h-[44dvh] overflow-y-auto px-4 pt-3 pb-2">
            {tab === "brief" && (sandbox ? sandboxBrief : brief)}
            {tab === "build" && (
              <div className="space-y-4">
                {palette}
                {solution}
              </div>
            )}
            {tab === "inspect" && inspect}
            {tab === "test" && test}
          </div>
        )}
        <nav className="grid grid-cols-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                sheetOpen && tab === t.id ? setSheetOpen(false) : openTab(t.id)
              }
              className={clsx(
                "flex flex-col items-center gap-0.5 py-2 text-[11px]",
                sheetOpen && tab === t.id ? "text-cyan-300" : "text-slate-500",
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

/** The reducer's id scheme, mirrored so a freshly placed block can be selected. */
function nextNum(g: Graph, kind: ComponentKind) {
  let n = 1
  while (g.components.some((c) => c.id === `${kind}-${n}`)) n++
  return n
}

function SandboxLoad({
  load,
  setLoad,
}: {
  load: LoadProfile
  setLoad: (l: LoadProfile) => void
}) {
  const row = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    fmt: (n: number) => string,
    key: keyof LoadProfile,
  ) => (
    <label className="block">
      <div className="flex justify-between text-[12px] text-slate-400">
        {label}
        <span className="font-mono text-slate-200">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setLoad({ ...load, [key]: Number(e.target.value) })}
        className="w-full accent-fuchsia-400"
      />
    </label>
  )
  const p = (n: number) => `${Math.round(n * 100)}%`
  return (
    <div className="space-y-2 rounded-xl border border-white/8 bg-white/[0.03] p-3">
      {row(
        "Peak traffic",
        load.peakRps,
        100,
        20_000,
        100,
        (n) => `${n.toLocaleString("en-US")}/s`,
        "peakRps",
      )}
      {row("Reads", load.readFraction, 0, 1, 0.05, p, "readFraction")}
      {row(
        "Cacheable reads",
        load.cacheableFraction,
        0,
        1,
        0.05,
        p,
        "cacheableFraction",
      )}
      {row(
        "Writes that are slow jobs",
        load.heavyWriteFraction,
        0,
        1,
        0.05,
        p,
        "heavyWriteFraction",
      )}
    </div>
  )
}
