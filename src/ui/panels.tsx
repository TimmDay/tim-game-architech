import clsx from "clsx"
import {
  Activity,
  BookOpen,
  Check,
  CircleAlert,
  Lightbulb,
  Info,
  Link2,
  Layers,
  ArrowRight,
  MessagesSquare,
  Minus,
  Play,
  Plus,
  Stethoscope,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react"
import { useState } from "react"
import { DECKS } from "~/decks"
import { CONCEPTS, type ConceptId } from "~/levels/concepts"
import type { Level } from "~/levels"
import { CLIENT_NAME, serviceName, type Provider } from "~/providers/names"
import { CATALOGUE } from "~/sim/catalogue"
import type { Finding } from "~/sim/findings"
import type { Targets } from "~/sim/grade"
import type { Settings } from "~/game/edit"
import {
  carries,
  consistencyOf,
  copies,
  MAX_SHARDS,
  partitionKeyOf,
} from "~/sim/simulate"
import type {
  ComponentKind,
  Graph,
  LoadProfile,
  PlacedComponent,
  SimResult,
} from "~/sim/types"
import { CLIENT_ID } from "~/sim/types"
import { plain } from "~/text"
import { ms, nines, pct, rps, usd } from "./format"
import { MiniBlock } from "./MiniBlock"
import { Rich } from "./Rich"

export const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 font-mono text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
    {children}
  </h3>
)

// ---------------------------------------------------------------------------

export function TargetList({
  targets,
  provider,
}: {
  targets: Targets
  provider: Provider
}) {
  const rows: [string, React.ReactNode][] = [
    ["p99 latency", `≤ ${ms(targets.p99Ms)}`],
    ["Errors at peak", `≤ ${pct(targets.maxErrorRate, 1)}`],
    ["Availability", `≥ ${nines(targets.availability)}`],
    ["Budget", `≤ ${usd(targets.budgetUsd)}/mo`],
  ]
  if (targets.writesReach.length > 0)
    rows.push([
      "Every write reaches",
      <span className="flex flex-col items-end">
        {targets.writesReach.map((s) => (
          <span key={s}>
            {s === "durable" ? (
              "a durable store"
            ) : (
              <Rich text={`{${s}}`} provider={provider} />
            )}
          </span>
        ))}
      </span>,
    ])
  if (targets.noBacklog) rows.push(["Async backlog", "must not grow"])
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-slate-400">{k}</dt>
          <dd className="text-right font-mono text-slate-100">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function BriefPanel({
  level,
  provider,
  onConcept,
  diagnose,
  onDeck,
}: {
  level: Level
  provider: Provider
  onConcept: (id: ConceptId) => void
  diagnose?: React.ReactNode
  onDeck?: () => void
}) {
  const [hint, setHint] = useState(false)
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span
            className={clsx(
              "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest uppercase",
              level.mode === "build"
                ? "bg-cyan-400/15 text-cyan-300"
                : "bg-rose-400/15 text-rose-300",
            )}
          >
            {level.mode}
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            {rps(level.load.peakRps)} peak ·{" "}
            {Math.round(level.load.readFraction * 100)}% reads
          </span>
        </div>
        <h2 className="font-display text-xl font-bold text-white">
          {level.title}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-300">
          <Rich text={level.brief} provider={provider} />
        </p>
      </div>
      {diagnose}
      <div>
        <H>Targets</H>
        <TargetList targets={level.targets} provider={provider} />
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-amber-300/90">
          <TriangleAlert size={13} /> Chaos round: {level.chaos.label}
        </p>
      </div>
      <div>
        <button
          type="button"
          onClick={() => setHint((h) => !h)}
          className="flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-white"
        >
          <Lightbulb size={14} /> {hint ? "Hide hint" : "Show hint"}
        </button>
        {hint && (
          <p className="mt-2 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-[13px] leading-relaxed text-amber-100/90">
            <Rich text={level.hint} provider={provider} />
          </p>
        )}
      </div>
      <div>
        <H>Concepts</H>
        <div className="flex flex-wrap gap-1.5">
          {level.concepts.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onConcept(c)}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[12px] text-slate-300 hover:border-cyan-300/40 hover:text-white"
            >
              <BookOpen size={12} /> {CONCEPTS[c].title}
            </button>
          ))}
        </div>
      </div>
      {onDeck && (DECKS[level.id]?.length ?? 0) > 0 && (
        <button
          type="button"
          onClick={onDeck}
          className="flex w-full items-center justify-between rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/[0.05] px-3 py-2.5 text-left hover:border-fuchsia-300/50"
        >
          <span>
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-fuchsia-100">
              <Layers size={15} /> Discussion deck
            </span>
            <span className="text-[12px] text-slate-400">
              {DECKS[level.id]?.length} interview prompts for this scenario
            </span>
          </span>
          <ArrowRight size={16} className="text-fuchsia-200/70" />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

export function PalettePanel({
  palette,
  provider,
  placing,
  onPick,
  onInfo,
}: {
  palette: ComponentKind[]
  provider: Provider
  placing?: ComponentKind
  onPick: (k: ComponentKind | undefined) => void
  onInfo: (k: ComponentKind) => void
}) {
  return (
    <div>
      <H>{placing ? "Tap an empty tile to place it" : "Components"}</H>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-2">
        {palette.map((k) => {
          const spec = CATALOGUE[k]
          const n = serviceName(k, provider)
          return (
            <div key={k} className="relative">
              <button
                type="button"
                onClick={() => onPick(placing === k ? undefined : k)}
                title={n.name}
                className={clsx(
                  "flex w-full flex-col items-center rounded-xl border px-1 pt-1 pb-2 text-center transition",
                  placing === k
                    ? "border-cyan-300 bg-cyan-300/10 shadow-[0_0_20px_-4px] shadow-cyan-400/60"
                    : "border-white/8 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
                )}
              >
                <MiniBlock kind={k} />
                <span className="mt-0.5 text-[12px] leading-tight font-semibold text-slate-100">
                  {n.short}
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {usd(spec.costPerInstanceMonthUsd)}/mo
                </span>
              </button>
              {/* A sibling, not a child: a button can't nest inside a button. */}
              <button
                type="button"
                onClick={() => onInfo(k)}
                aria-label={`About ${n.name}`}
                className="absolute top-1 right-1 grid size-7 place-items-center rounded-full text-slate-500 hover:bg-white/10 hover:text-white"
              >
                <Info size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  note,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  note?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[13px] text-slate-200">{label}</div>
        {note && <div className="text-[11px] text-slate-500">{note}</div>}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Fewer ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 disabled:opacity-30"
        >
          <Minus size={15} />
        </button>
        <span className="w-8 text-center font-mono text-lg text-white">
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 disabled:opacity-30"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  )
}

const Stat = ({ k, v, bad }: { k: string; v: string; bad?: boolean }) => (
  <div className="rounded-lg bg-white/[0.04] px-2 py-1.5">
    <div className="text-[10px] tracking-wider text-slate-500 uppercase">
      {k}
    </div>
    <div
      className={clsx(
        "font-mono text-[14px]",
        bad ? "text-rose-300" : "text-slate-100",
      )}
    >
      {v}
    </div>
  </div>
)

/**
 * Sharding and consistency, for levels that make them a choice. Every value
 * shown comes from the engine's own helpers, so the sidebar shows what the
 * simulation is actually using.
 */
function DataOptions({
  c,
  load,
  onSet,
}: {
  c: PlacedComponent
  load: LoadProfile
  onSet: (v: Settings) => void
}) {
  const key = partitionKeyOf(c, load)
  const mode = consistencyOf(c, load)
  if (!key && !mode) return null
  const d = copies(c)
  return (
    <div className="space-y-3 rounded-xl border border-indigo-300/20 bg-indigo-300/[0.04] p-3">
      {key && c.kind === "sql-primary" && (
        <Stepper
          label="Shards"
          value={c.shards ?? 1}
          min={1}
          max={MAX_SHARDS}
          onChange={(v) => onSet({ shards: v })}
          note="Each shard is its own primary and standbys"
        />
      )}
      {key && (
        <label className="block">
          <div className="text-[13px] text-slate-200">Partition key</div>
          <div className="mb-1.5 text-[11px] text-slate-500">
            {c.kind === "nosql"
              ? `Splits the data across its ${c.instances} instance${c.instances === 1 ? "" : "s"}`
              : "Which shard each record lives on"}
          </div>
          <select
            value={key.id}
            onChange={(e) => onSet({ partitionKey: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-2 text-[13px] text-slate-100"
          >
            {(load.partitionKeys ?? []).map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {mode && (
        <div>
          <div className="text-[13px] text-slate-200">
            During a network split
          </div>
          <div className="mb-1.5 text-[11px] text-slate-500">
            {c.kind === "nosql" || CATALOGUE[c.kind].managed
              ? "Three copies, one per zone"
              : `${d} cop${d === 1 ? "y" : "ies"}: one per zone it's spread over`}
          </div>
          <div className="grid grid-cols-2 gap-1.5" role="radiogroup">
            {(
              [
                ["strong", "Refuse", "Consistent"],
                ["eventual", "Keep serving", "Available"],
              ] as const
            ).map(([value, label, sub]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => onSet({ consistency: value })}
                className={clsx(
                  "rounded-lg border px-2 py-1.5 text-left",
                  mode === value
                    ? "border-indigo-300 bg-indigo-300/15 text-white"
                    : "border-white/10 text-slate-400 hover:text-slate-200",
                )}
              >
                <div className="text-[13px] font-semibold">{label}</div>
                <div className="text-[11px] opacity-80">{sub}</div>
              </button>
            ))}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            {mode === "strong"
              ? "Writes wait for a majority of copies, so each one waits on another zone."
              : "Writes return once one copy has them. The others catch up, or disagree during a split."}
          </div>
        </div>
      )}
    </div>
  )
}

export function InspectPanel({
  graph,
  load,
  provider,
  selectedId,
  selectedEdgeId,
  result,
  live,
  connecting,
  onConnect,
  onSet,
  onRemove,
  onRemoveEdge,
  onLearn,
  onDiscuss,
}: {
  graph: Graph
  /** The level's load: what decides whether sharding and consistency show. */
  load?: LoadProfile
  provider: Provider
  selectedId?: string
  selectedEdgeId?: string
  result?: SimResult
  live: boolean
  connecting: boolean
  onConnect: (id: string) => void
  onSet: (id: string, v: Settings) => void
  onRemove: (id: string) => void
  onRemoveEdge: (id: string) => void
  onLearn: (kind: ComponentKind) => void
  /** Omitted where there's no scenario to discuss (Survival). */
  onDiscuss?: (id: string) => void
}) {
  const label = (id: string) => {
    if (id === CLIENT_ID) return CLIENT_NAME.short
    const c = graph.components.find((c) => c.id === id)
    return c ? serviceName(c.kind, provider).short : id
  }

  if (selectedEdgeId) {
    const e = graph.edges.find((e) => e.id === selectedEdgeId)
    if (!e) return null
    const c = carries(graph, e)
    const async = result?.perEdge[e.id]?.async
    return (
      <div className="space-y-3">
        <H>Connection</H>
        <div className="text-[15px] font-semibold text-white">
          {label(e.from)} → {label(e.to)}
        </div>
        <p className="text-[13px] leading-relaxed text-slate-400">
          {c === "writes"
            ? "Carries messages (writes) only."
            : c === "reads"
              ? "Carries reads only."
              : "Carries reads and writes."}{" "}
          {async || c === "writes"
            ? "Asynchronous: the sender doesn't wait for the work to finish."
            : "Synchronous: the caller waits for the answer."}
        </p>
        {live && result && (
          <Stat k="Traffic" v={rps(result.perEdge[e.id]?.rps ?? 0)} />
        )}
        <button
          type="button"
          onClick={() => onRemoveEdge(e.id)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 py-2.5 text-[14px] text-rose-200"
        >
          <Trash2 size={15} /> Remove connection
          <kbd className="ml-1 hidden rounded border border-rose-300/30 px-1.5 font-mono text-[10px] text-rose-200/70 lg:inline">
            D
          </kbd>
        </button>
      </div>
    )
  }

  if (!selectedId) {
    return (
      <div className="space-y-2 text-[13px] leading-relaxed text-slate-400">
        <H>Inspect</H>
        <p>
          Tap a component to configure it. Tap a connection to inspect or remove
          it.
        </p>
        <p>
          To wire things up, select a component (start with{" "}
          <b className="text-slate-200">Users</b>), press{" "}
          <b className="text-slate-200">Connect</b>, then tap where its requests
          should go.
        </p>
        <p>
          Drag a component to move it. Pinch or scroll to zoom, drag the floor
          to pan.
        </p>
      </div>
    )
  }

  const connectBtn = (
    <button
      type="button"
      onClick={() => onConnect(selectedId)}
      className={clsx(
        "flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[14px] font-semibold",
        connecting
          ? "border-cyan-300 bg-cyan-300 text-slate-950"
          : "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
      )}
    >
      <Link2 size={15} /> {connecting ? "Now tap the target…" : "Connect to…"}
      {!connecting && (
        <kbd className="ml-1 hidden rounded border border-cyan-300/30 px-1.5 font-mono text-[10px] text-cyan-200/70 lg:inline">
          C
        </kbd>
      )}
    </button>
  )

  if (selectedId === CLIENT_ID) {
    return (
      <div className="space-y-3">
        <H>Traffic source</H>
        <div className="text-[15px] font-semibold text-white">Users</div>
        <p className="text-[13px] text-slate-400">
          Every request starts here. Connect it to your entry point.
        </p>
        {connectBtn}
      </div>
    )
  }

  const c = graph.components.find((c) => c.id === selectedId)
  if (!c) return null
  const spec = CATALOGUE[c.kind]
  const n = serviceName(c.kind, provider)
  const generic = serviceName(c.kind, "generic")
  const m = result?.perComponent[c.id]
  const capacityNote = spec.readOnly
    ? `${rps(spec.capacity.readRps)} reads each, no writes`
    : spec.capacity.readRps === spec.capacity.writeRps
      ? `${rps(spec.capacity.readRps)} each`
      : `${rps(spec.capacity.readRps)} reads / ${rps(spec.capacity.writeRps)} writes`

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <MiniBlock kind={c.kind} size={48} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] leading-tight font-semibold text-white">
            {n.name}
          </div>
          {provider !== "generic" && (
            <div className="text-[12px] text-slate-500">{generic.name}</div>
          )}
          <div className="mt-0.5 font-mono text-[11px] text-slate-500">
            {capacityNote} · {usd(spec.costPerInstanceMonthUsd)}/mo
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onLearn(c.kind)}
            aria-label="What is this component?"
            title="What is this component?"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <BookOpen size={17} />
          </button>
          {onDiscuss && (
            <button
              type="button"
              onClick={() => onDiscuss(c.id)}
              aria-label="What is it doing in this design?"
              title="What is it doing in this design?"
              className="rounded-lg p-1.5 text-fuchsia-300/80 hover:bg-white/5 hover:text-fuchsia-200"
            >
              <MessagesSquare size={17} />
            </button>
          )}
        </div>
      </div>

      {spec.maxInstances > 1 && (
        <Stepper
          label="Instances"
          value={c.instances}
          min={1}
          max={spec.maxInstances}
          onChange={(v) => onSet(c.id, { instances: v })}
          note={
            spec.scalesOut
              ? undefined
              : "Extras are standbys: no added capacity"
          }
        />
      )}
      {spec.managed ? (
        <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] text-slate-400">
          Managed service: the provider spreads it across zones for you.
        </p>
      ) : (
        <Stepper
          label="Zones"
          value={c.zones}
          min={1}
          max={3}
          onChange={(v) => onSet(c.id, { zones: v })}
          note={
            c.instances < c.zones
              ? `Only ${c.instances} instance${c.instances === 1 ? "" : "s"}: ${c.instances} zone${c.instances === 1 ? "" : "s"} really used`
              : "Failure domains the instances are spread over"
          }
        />
      )}

      {load && <DataOptions c={c} load={load} onSet={(v) => onSet(c.id, v)} />}

      {live && m && (
        <div className="grid grid-cols-3 gap-1.5">
          <Stat k="Load" v={pct(m.utilization, 0)} bad={m.utilization >= 1} />
          <Stat k="Reads" v={rps(m.readRps)} />
          <Stat k="Writes" v={rps(m.writeRps)} />
          <Stat k="p99" v={ms(m.p99Ms)} bad={m.p99Ms > 1000} />
          <Stat k="Dropped" v={rps(m.droppedRps)} bad={m.droppedRps > 0} />
          <Stat
            k="Alive"
            v={`${m.aliveInstances}/${c.instances}`}
            bad={m.aliveInstances === 0}
          />
          {(m.shards ?? 1) > 1 && (
            <Stat
              k="Busiest shard"
              v={pct(m.hotShardShare ?? 0, 0)}
              bad={m.utilization >= 1}
            />
          )}
        </div>
      )}

      {connectBtn}
      <button
        type="button"
        onClick={() => onRemove(c.id)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-[13px] text-slate-400 hover:border-rose-400/40 hover:text-rose-200"
      >
        <Trash2 size={14} /> Remove
        <kbd className="ml-1 hidden rounded border border-white/15 px-1.5 font-mono text-[10px] text-slate-500 lg:inline">
          D
        </kbd>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Metric({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok?: boolean
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border px-2.5 py-2",
        ok === undefined
          ? "border-white/8 bg-white/[0.03]"
          : ok
            ? "border-emerald-400/25 bg-emerald-400/[0.06]"
            : "border-rose-400/30 bg-rose-400/[0.07]",
      )}
    >
      <div className="flex items-center justify-between text-[10px] tracking-wider text-slate-500 uppercase">
        {label}
        {ok !== undefined &&
          (ok ? (
            <Check size={12} className="text-emerald-300" />
          ) : (
            <X size={12} className="text-rose-300" />
          ))}
      </div>
      <div className="font-mono text-[16px] text-white">{value}</div>
    </div>
  )
}

export function FindingList({
  items,
  provider,
  onConcept,
}: {
  items: Finding[]
  provider: Provider
  onConcept: (c: ConceptId) => void
}) {
  if (items.length === 0)
    return (
      <p className="text-[13px] text-emerald-300/90">
        No problems spotted at this load.
      </p>
    )
  return (
    <ul className="space-y-1.5">
      {items.map((f, i) => (
        <li
          key={i}
          className={clsx(
            "flex gap-2 rounded-lg px-2.5 py-2 text-[13px] leading-snug",
            f.severity === "error"
              ? "bg-rose-400/[0.08] text-rose-50"
              : "bg-amber-300/[0.07] text-amber-50",
          )}
        >
          {f.severity === "error" ? (
            <CircleAlert size={15} className="mt-0.5 shrink-0 text-rose-300" />
          ) : (
            <TriangleAlert
              size={15}
              className="mt-0.5 shrink-0 text-amber-300"
            />
          )}
          <span>
            <Rich text={f.text} provider={provider} />
            {f.concept && (
              <button
                type="button"
                onClick={() => {
                  if (f.concept) onConcept(f.concept)
                }}
                className="ml-1.5 text-cyan-300 underline decoration-cyan-300/40 underline-offset-2"
              >
                {CONCEPTS[f.concept].title}
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function TestPanel({
  result,
  traffic,
  setTraffic,
  live,
  setLive,
  peakRps,
  targets,
  provider,
  liveFindings,
  running,
  phase,
  onRun,
  onConcept,
  sandbox,
}: {
  result: SimResult
  traffic: number
  setTraffic: (n: number) => void
  live: boolean
  setLive: (b: boolean) => void
  peakRps: number
  targets?: Targets
  provider: Provider
  liveFindings: Finding[]
  running: boolean
  phase: string
  onRun: () => void
  onConcept: (c: ConceptId) => void
  sandbox?: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      {!sandbox && (
        <button
          type="button"
          disabled={running}
          onClick={onRun}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-3 text-[15px] font-bold text-slate-950 shadow-[0_0_30px_-6px] shadow-fuchsia-500/60 disabled:opacity-80"
        >
          {running ? (
            <>
              <Activity size={17} className="animate-pulse" /> {phase}
            </>
          ) : (
            <>
              <Play size={17} /> Run load test
            </>
          )}
        </button>
      )}
      {sandbox}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <H>Traffic</H>
          <label className="flex items-center gap-1.5 text-[12px] text-slate-400">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
              className="accent-cyan-400"
              disabled={running}
            />
            Live
          </label>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={traffic}
          disabled={running}
          onChange={(e) => {
            setTraffic(Number(e.target.value))
            setLive(true)
          }}
          className="w-full accent-cyan-400"
          aria-label="Traffic as a share of peak"
        />
        <div className="flex justify-between font-mono text-[11px] text-slate-500">
          <span>0</span>
          <span className="text-cyan-200">
            {rps(peakRps * traffic)} · {Math.round(traffic * 100)}% of peak
          </span>
          <span>2×</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Metric
          label="p99"
          value={result.connected ? ms(result.p99Ms) : "-"}
          ok={
            live && targets
              ? result.connected && result.p99Ms <= targets.p99Ms
              : undefined
          }
        />
        <Metric
          label="Errors"
          value={pct(result.errorRate, 2)}
          ok={
            live && targets
              ? result.errorRate <= targets.maxErrorRate
              : undefined
          }
        />
        <Metric
          label="Availability"
          value={nines(result.availability)}
          ok={targets ? result.availability >= targets.availability : undefined}
        />
        <Metric
          label="Cost"
          value={`${usd(result.monthlyCostUsd)}/mo`}
          ok={targets ? result.monthlyCostUsd <= targets.budgetUsd : undefined}
        />
        {(targets?.noBacklog ?? result.backlogGrowthRps > 0) && (
          <Metric
            label="Backlog growth"
            value={rps(result.backlogGrowthRps)}
            ok={live ? result.backlogGrowthRps <= 0.5 : undefined}
          />
        )}
      </div>
      {live && (
        <div>
          <H>What the test sees</H>
          <FindingList
            items={liveFindings}
            provider={provider}
            onConcept={onConcept}
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

export function DiagnoseBox({
  level,
  provider,
  active,
  solved,
  attempts,
  onToggle,
}: {
  level: Level
  provider: Provider
  active: boolean
  solved: boolean
  attempts: number
  onToggle: () => void
}) {
  if (!level.rootCause) return null
  if (solved)
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] p-3">
        <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-emerald-200">
          <Stethoscope size={15} /> Root cause found
          {attempts === 0 && (
            <span className="rounded bg-emerald-300 px-1.5 font-mono text-[10px] text-slate-950">
              FIRST TRY
            </span>
          )}
        </div>
        <p className="text-[13px] leading-relaxed text-emerald-50/90">
          <Rich text={level.rootCause.explanation} provider={provider} />
        </p>
        <p className="mt-2 text-[12px] text-emerald-200/70">
          Now fix it and run the load test.
        </p>
      </div>
    )
  return (
    <div className="rounded-xl border border-rose-400/25 bg-rose-400/[0.06] p-3">
      <p className="mb-2 text-[13px] text-rose-100/90">
        Run the load test, read the symptoms, then name the component that is
        really to blame.
        {attempts > 0 &&
          ` (${attempts} wrong guess${attempts === 1 ? "" : "es"} so far)`}
      </p>
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          "flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[14px] font-semibold",
          active
            ? "bg-rose-300 text-slate-950"
            : "border border-rose-300/40 text-rose-100",
        )}
      >
        <Stethoscope size={15} />{" "}
        {active ? "Tap the culprit on the board…" : "Diagnose"}
      </button>
    </div>
  )
}

export const nameOf = (graph: Graph, id: string, provider: Provider) => {
  const c = graph.components.find((c) => c.id === id)
  return c ? plain(`{${c.kind}}`, provider) : id
}
