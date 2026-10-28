import clsx from "clsx"
import { Check, ChevronDown, RotateCcw, Star, X } from "lucide-react"
import type { ConceptId } from "~/levels/concepts"
import type { Level } from "~/levels"
import type { Provider } from "~/providers/names"
import type { Finding } from "~/sim/findings"
import type { Check as CheckT, Grade } from "~/sim/grade"
import { ms, nines, pct, rps, usd } from "./format"
import { Modal, ModalHeader } from "./Modal"
import { Confetti } from "./Confetti"
import { useEffect, useState } from "react"
import { sfx } from "~/game/sound"
import { FindingList, H } from "./panels"
import { Rich } from "./Rich"

const STAR_LABEL = [
  "Handles peak",
  "Highly available",
  "Survives chaos, production-ready",
]

function checkLabel(
  c: CheckT,
  g: Grade,
  level: Level,
  provider: Provider,
): React.ReactNode {
  const t = level.targets
  switch (c.id) {
    case "traffic":
      return `Errors at peak ${pct(g.peak.errorRate, 2)} (≤ ${pct(t.maxErrorRate, 1)})`
    case "latency":
      return `p99 ${ms(g.peak.p99Ms)} (≤ ${ms(t.p99Ms)})`
    case "budget":
      return `Cost ${usd(g.peak.monthlyCostUsd)}/mo (≤ ${usd(t.budgetUsd)})`
    case "writes":
      if (t.writesReach.length === 0)
        return (
          <>
            {(level.load.traffic ?? [])
              .filter((x) => x.of === "writes")
              .map((x, i) => (
                <span key={x.id}>
                  {i > 0 && "; "}
                  {x.label} reach{" "}
                  <Rich
                    text={x.to.map((k) => `{${k}}`).join(" or ")}
                    provider={provider}
                  />
                </span>
              ))}
          </>
        )
      return (
        <>
          Every write reaches{" "}
          {t.writesReach.map((s, i) => (
            <span key={s}>
              {i > 0 && ", "}
              {s === "durable" ? (
                "a durable store"
              ) : (
                <Rich text={`{${s}}`} provider={provider} />
              )}
            </span>
          ))}
        </>
      )
    case "once": {
      const timed = level.load.timed
      const got = g.peak.timed?.delivered ?? 0
      return `${timed?.label ?? "Timed work"} reach ${rps(got)} (exactly ${rps(timed?.rps ?? 0)}: each one once)`
    }
    case "reads":
      return (
        <>
          Every read a cache doesn't answer reaches{" "}
          {(t.readsReach ?? []).map((k, i) => (
            <span key={k}>
              {i > 0 && " or "}
              <Rich text={`{${k}}`} provider={provider} />
            </span>
          ))}
        </>
      )
    case "apart":
      return `Each shard holds ${t.keepApart?.what ?? "one group's records"} (at least ${t.keepApart?.minShards ?? 1} shards, split to keep them apart)`
    case "backlog":
      return `Backlog growth ${rps(g.peak.backlogGrowthRps)} (must be 0)`
    case "availability":
      return `Availability ${nines(g.peak.availability)} (≥ ${nines(t.availability)})`
    case "lean":
      return g.overkill.length
        ? `More than it needs: ${g.overkill.length} thing${g.overkill.length === 1 ? "" : "s"} to run and maintain for nothing this level asks`
        : "Nothing it doesn't need"
    case "practices":
      return `Production settings: ${g.practices.expected - g.practices.missing} of ${g.practices.expected} in place`
    case "chaos":
      if (t.onSplit === "consistent")
        return `${level.chaos.label}: ${pct(g.chaos.errorRate, 1)} refused (< 50%), ${rps(g.chaos.divergentRps)} conflicting writes (must be 0)`
      return [
        `${level.chaos.label}: ${pct(g.chaos.errorRate, 1)} errors`,
        t.noBacklog === true &&
          `backlog growth ${rps(g.chaos.backlogGrowthRps)}`,
        g.chaos.duplicateRps > 0.5 &&
          `${rps(g.chaos.duplicateRps)} applied twice`,
        level.load.timed &&
          `${level.load.timed.label.toLowerCase()} ${rps(g.chaos.timed?.delivered ?? 0)} (exactly ${rps(level.load.timed.rps)})`,
        g.chaos.exposed.length > 0 && "answered an unsigned caller",
        t.rpoMinutes !== undefined &&
          `restore loses ${Number.isFinite(g.chaos.dataLossMinutes) ? `${Math.round(g.chaos.dataLossMinutes)} min` : "everything"} (≤ ${t.rpoMinutes} min)`,
      ]
        .filter(Boolean)
        .join(", ")
  }
}

export function Results({
  grade,
  level,
  provider,
  findings,
  onClose,
  onNext,
  onConcept,
  onDeck,
}: {
  grade: Grade
  level: Level
  provider: Provider
  findings: Finding[]
  onClose: () => void
  onNext?: () => void
  onConcept: (c: ConceptId) => void
  onDeck?: () => void
}) {
  // The stars land one by one (see the star-in delays below); sound them too.
  useEffect(() => {
    const timers: number[] = []
    if (grade.stars === 0) sfx.fail()
    for (let n = 0; n < grade.stars; n++)
      timers.push(window.setTimeout(() => sfx.star(n), 140 * (n + 1) + 120))
    if (grade.stars === 3) sfx.fanfare()
    return () => timers.forEach(clearTimeout)
  }, [grade.stars])

  // Before the first two stars, third-star advice (production settings,
  // extra parts) would bury what's actually broken: hold it back a tap.
  const [showAll, setShowAll] = useState(false)
  const early = grade.stars < 2 && !showAll && findings.some((f) => !f.forStar3)
  const shown = early ? findings.filter((f) => !f.forStar3) : findings
  const held = early ? findings.filter((f) => f.forStar3) : []

  const headline =
    grade.stars === 3
      ? "Load bearing."
      : grade.stars === 2
        ? grade.checks.find((c) => c.id === "chaos")?.pass
          ? "Survives the chaos. Not ready to ship."
          : "Solid, until something breaks."
        : grade.stars === 1
          ? "It works. For now."
          : "It fell over."
  return (
    <Modal onClose={onClose} wide>
      {grade.stars === 3 && <Confetti />}
      <ModalHeader className="text-center">
        <div className="mb-2 flex justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              size={40}
              className={clsx(
                "star-in",
                n <= grade.stars
                  ? "fill-amber-300 text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.7)]"
                  : "text-slate-700",
              )}
              style={{ animationDelay: `${n * 140}ms` }}
            />
          ))}
        </div>
        <h2 className="font-display text-2xl font-bold text-white">
          {headline}
        </h2>
      </ModalHeader>

      <div className="mt-4 space-y-3">
        {[1, 2, 3].map((star) => (
          <div key={star}>
            <H>
              ★{star} {STAR_LABEL[star - 1]}
            </H>
            <ul className="space-y-1">
              {grade.checks
                .filter((c) => c.star === star)
                .map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-2 text-[13px] text-slate-200"
                  >
                    {c.pass ? (
                      <Check
                        size={15}
                        className="mt-0.5 shrink-0 text-emerald-300"
                      />
                    ) : (
                      <X size={15} className="mt-0.5 shrink-0 text-rose-300" />
                    )}
                    <span>{checkLabel(c, grade, level, provider)}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {findings.length > 0 && (
        <div className="mt-4">
          <H>Findings</H>
          <FindingList
            items={shown}
            provider={provider}
            onConcept={onConcept}
          />
          {held.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-1.5 flex w-full items-center justify-between rounded-lg border border-white/8 px-2.5 py-2 text-left text-[13px] text-slate-300 hover:border-white/20"
            >
              <span>
                {held.length} more for ★3, once it handles peak and stays up
              </span>
              <ChevronDown size={15} className="text-slate-500" />
            </button>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-[14px] text-slate-200"
        >
          <RotateCcw size={15} /> Keep building
        </button>
        {onNext && grade.stars > 0 && (
          <button
            type="button"
            onClick={onNext}
            className="flex-1 rounded-xl bg-cyan-300 py-2.5 text-[14px] font-bold text-slate-950"
          >
            Next level
          </button>
        )}
      </div>
      {onDeck && (
        <button
          type="button"
          onClick={() => onDeck()}
          className="mt-3 w-full text-center text-[13px] text-fuchsia-200/90 underline decoration-fuchsia-300/40 underline-offset-4 hover:text-fuchsia-100"
        >
          Now practise talking it through: open the discussion deck
        </button>
      )}
    </Modal>
  )
}
