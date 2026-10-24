import { Activity, Scale, TriangleAlert } from "lucide-react"
import { discuss, liveFacts, type Scenario } from "~/levels/roles"
import { serviceName, type Provider } from "~/providers/names"
import type { Graph, LoadProfile, SimResult } from "~/sim/types"
import { H } from "./panels"
import { MiniBlock } from "./MiniBlock"
import { Rich } from "./Rich"
import { ModalHeader } from "./Modal"

/** What one placed component is doing in this design, and what it costs you. */
export function DiscussView({
  graph,
  id,
  scenario,
  load,
  result,
  live,
  provider,
  hideCaution,
}: {
  graph: Graph
  id: string
  scenario: Scenario
  load: LoadProfile
  result: SimResult
  live: boolean
  provider: Provider
  /** Repair mode before diagnosis: the caution can name the culprit. */
  hideCaution: boolean
}) {
  const c = graph.components.find((c) => c.id === id)
  const d = discuss(graph, id, scenario, load)
  if (!c || !d) return null
  const facts = liveFacts(graph, id, result)
  return (
    <div className="space-y-4">
      <ModalHeader className="flex items-center gap-3">
        <MiniBlock kind={c.kind} size={56} />
        <div>
          <div className="font-mono text-[10px] tracking-[0.18em] text-fuchsia-300/80 uppercase">
            In this design
          </div>
          <h3 className="font-display text-lg leading-tight font-bold text-white">
            {serviceName(c.kind, provider).name}
          </h3>
        </div>
      </ModalHeader>

      <p className="text-[14px] leading-relaxed text-slate-200">
        <Rich text={d.role} provider={provider} />
      </p>

      {d.caution && !hideCaution && (
        <p className="flex gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] p-3 text-[13px] leading-relaxed text-amber-50">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <span>
            <Rich text={d.caution} provider={provider} />
          </span>
        </p>
      )}

      <div>
        <H>
          <span className="inline-flex items-center gap-1.5">
            <Activity size={12} /> {live ? "Right now" : "At peak traffic"}
          </span>
        </H>
        <ul className="space-y-1 text-[13px] leading-relaxed text-slate-300">
          {facts.map((f, i) => (
            <li key={i}>
              <Rich text={f} provider={provider} />
            </li>
          ))}
        </ul>
      </div>

      <div>
        <H>
          <span className="inline-flex items-center gap-1.5">
            <Scale size={12} /> Trade-offs
          </span>
        </H>
        <ul className="space-y-2">
          {d.tradeoffs.map((t, i) => (
            <li
              key={i}
              className="rounded-lg bg-white/[0.04] px-3 py-2 text-[13px] leading-relaxed text-slate-300"
            >
              <Rich text={t} provider={provider} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
