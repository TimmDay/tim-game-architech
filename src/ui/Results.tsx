import clsx from "clsx"
import { Check, RotateCcw, Star, X } from "lucide-react"
import type { ConceptId } from "~/levels/concepts"
import type { Level } from "~/levels"
import type { Provider } from "~/providers/names"
import type { Finding } from "~/sim/findings"
import type { Check as CheckT, Grade } from "~/sim/grade"
import { ms, nines, pct, rps, usd } from "./format"
import { Modal } from "./Modal"
import { FindingList, H } from "./panels"
import { Rich } from "./Rich"

const STAR_LABEL = ["Handles peak", "Highly available", "Survives chaos"]

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
    case "backlog":
      return `Backlog growth ${rps(g.peak.backlogGrowthRps)} (must be 0)`
    case "availability":
      return `Availability ${nines(g.peak.availability)} (≥ ${nines(t.availability)})`
    case "chaos":
      return `${level.chaos.label}: ${pct(g.chaos.errorRate, 1)} errors`
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
  const headline =
    grade.stars === 3
      ? "Load bearing."
      : grade.stars === 2
        ? "Solid, until something breaks."
        : grade.stars === 1
          ? "It works. For now."
          : "It fell over."
  return (
    <Modal onClose={onClose} wide>
      <div className="text-center">
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
      </div>

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
            items={findings}
            provider={provider}
            onConcept={onConcept}
          />
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
          onClick={onDeck}
          className="mt-3 w-full text-center text-[13px] text-fuchsia-200/90 underline decoration-fuchsia-300/40 underline-offset-4 hover:text-fuchsia-100"
        >
          Now practise talking it through: open the discussion deck
        </button>
      )}
    </Modal>
  )
}
