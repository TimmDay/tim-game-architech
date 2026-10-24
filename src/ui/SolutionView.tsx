import { ChevronDown, Star } from "lucide-react"
import { useMemo } from "react"
import type { Level } from "~/levels"
import { discuss } from "~/levels/roles"
import { SOLUTIONS } from "~/levels/solutions"
import { serviceName, type Provider } from "~/providers/names"
import { grade } from "~/sim/grade"
import { expectedPractices, PRACTICE_LABEL } from "~/sim/practices"
import { Board } from "./Board"
import { ms, nines, pct, usd } from "./format"
import { H } from "./panels"
import { Rich } from "./Rich"

const noop = () => {}

/** The level's reference design, running, with the reasoning written out. */
export function SolutionView({
  level,
  provider,
}: {
  level: Level
  provider: Provider
}) {
  const s = SOLUTIONS[level.id]
  const g = useMemo(
    () => grade(level.reference, level.load, level.targets, level.chaos.faults),
    [level],
  )
  const checklist = useMemo(() => {
    const stakes = level.targets.stakes
    if (!stakes) return []
    const by = new Map<string, string[]>()
    for (const x of expectedPractices(level.reference, stakes))
      by.set(x.componentId, [
        ...(by.get(x.componentId) ?? []),
        PRACTICE_LABEL[x.practice],
      ])
    return [...by].flatMap(([id, labels]) => {
      const c = level.reference.components.find((c) => c.id === id)
      return c ? [`{${c.kind}}: ${labels.join(", ")}.`] : []
    })
  }, [level])
  if (!s) return null
  const list = (items: string[], ordered = false) => {
    const Tag = ordered ? "ol" : "ul"
    return (
      <Tag className="space-y-1.5">
        {items.map((t, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-[14px] leading-relaxed text-slate-300"
          >
            <span className="mt-0.5 shrink-0 font-mono text-[11px] text-cyan-300/80">
              {ordered ? `${i + 1}.` : "•"}
            </span>
            <span>
              <Rich text={t} provider={provider} />
            </span>
          </li>
        ))}
      </Tag>
    )
  }

  return (
    <div className="space-y-5">
      <div className="pr-8">
        <div className="font-mono text-[10px] tracking-[0.18em] text-amber-300/80 uppercase">
          Suggested solution
        </div>
        <h2 className="font-display text-xl font-bold text-white">
          {level.title}
        </h2>
      </div>

      <div className="h-64 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60 sm:h-80">
        <Board
          graph={level.reference}
          provider={provider}
          result={g.peak}
          live
          placing={false}
          onTapNode={noop}
          onTapEdge={noop}
          onTapTile={noop}
          onMove={noop}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {[
          ["p99", ms(g.peak.p99Ms)],
          ["Errors", pct(g.peak.errorRate, 2)],
          ["Availability", nines(g.peak.availability)],
          ["Cost", `${usd(g.peak.monthlyCostUsd)}/mo`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white/[0.04] px-2.5 py-1.5">
            <div className="text-[10px] tracking-wider text-slate-500 uppercase">
              {k}
            </div>
            <div className="font-mono text-[14px] text-white">{v}</div>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-[12px] text-amber-200/80">
        {[1, 2, 3].map((n) => (
          <Star
            key={n}
            size={13}
            className={
              n <= g.stars ? "fill-amber-300 text-amber-300" : "text-slate-700"
            }
          />
        ))}
        <span className="ml-1">
          Survives the chaos round: {level.chaos.label.toLowerCase()}.
        </span>
      </p>

      <p className="text-[15px] leading-relaxed text-slate-200">
        <Rich text={s.overview} provider={provider} />
      </p>

      <section>
        <H>How a request flows</H>
        {list(s.walkthrough, true)}
      </section>
      <section>
        <H>Why these numbers</H>
        {list(s.numbers)}
      </section>
      <section>
        <H>Trade-offs</H>
        {list(s.tradeoffs)}
      </section>
      <section>
        <H>Alternatives, and why not</H>
        {list(s.alternatives)}
      </section>

      {checklist.length > 0 && (
        <section>
          <H>Production settings</H>
          {list(checklist)}
        </section>
      )}

      <section>
        <H>Component by component</H>
        <div className="space-y-1.5">
          {level.reference.components.map((c) => {
            const d = discuss(level.reference, c.id, level.scenario, level.load)
            if (!d) return null
            return (
              <details
                key={c.id}
                className="group rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold text-slate-100">
                  <span>
                    {serviceName(c.kind, provider).name}
                    {c.instances > 1 && (
                      <span className="ml-1.5 font-mono text-[12px] text-cyan-300">
                        ×{c.instances}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    size={15}
                    className="text-slate-500 transition group-open:rotate-180"
                  />
                </summary>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
                  <Rich text={d.role} provider={provider} />
                </p>
                <ul className="mt-2 space-y-1">
                  {d.tradeoffs.map((t, i) => (
                    <li
                      key={i}
                      className="text-[12px] leading-relaxed text-slate-400"
                    >
                      • <Rich text={t} provider={provider} />
                    </li>
                  ))}
                </ul>
              </details>
            )
          })}
        </div>
      </section>
    </div>
  )
}
