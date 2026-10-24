import clsx from "clsx"
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react"
import { CONCEPTS, type ConceptId } from "~/levels/concepts"
import type { Provider } from "~/providers/names"
import type { Report } from "~/sim/advice"
import type { SimResult } from "~/sim/types"
import { ms, nines, pct, rps, usd } from "./format"
import { Modal, ModalHeader } from "./Modal"
import { H } from "./panels"
import { Rich } from "./Rich"

const HEADLINE: Record<Report["status"], string> = {
  healthy: "It held.",
  strained: "It held, just.",
  broken: "Something broke.",
}

/**
 * The sandbox's load-test result. No stars or targets: what happened at peak,
 * why each problem happened, what would fix it, and what to weigh.
 */
export function SandboxReport({
  result,
  report,
  provider,
  onClose,
  onConcept,
}: {
  result: SimResult
  report: Report
  provider: Provider
  onClose: () => void
  onConcept: (c: ConceptId) => void
}) {
  const stats: [string, string, boolean][] = [
    ["Peak", rps(result.offeredRps), false],
    ["p99", ms(result.p99Ms), result.p99Ms > 500],
    ["Errors", pct(result.errorRate, 2), result.errorRate > 0.001],
    ["Availability", nines(result.availability), false],
    ["Cost", `${usd(result.monthlyCostUsd)}/mo`, false],
    [
      "Backlog",
      `${rps(result.backlogGrowthRps)}`,
      result.backlogGrowthRps > 0.5,
    ],
  ]
  return (
    <Modal onClose={onClose} wide>
      <div className="space-y-4">
        <ModalHeader>
          <div className="font-mono text-[10px] tracking-[0.18em] text-cyan-300/80 uppercase">
            Sandbox load test
          </div>
          <h2
            className={clsx(
              "font-display text-2xl font-bold",
              report.status === "broken"
                ? "text-rose-200"
                : report.status === "strained"
                  ? "text-amber-200"
                  : "text-emerald-200",
            )}
          >
            {HEADLINE[report.status]}
          </h2>
        </ModalHeader>

        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {stats.map(([k, v, bad]) => (
            <div key={k} className="rounded-lg bg-white/[0.04] px-2.5 py-1.5">
              <div className="text-[10px] tracking-wider text-slate-500 uppercase">
                {k}
              </div>
              <div
                className={clsx(
                  "font-mono text-[14px]",
                  bad ? "text-rose-300" : "text-white",
                )}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        {report.advice.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-400/[0.08] px-3 py-2.5 text-[14px] text-emerald-100">
            <CircleCheck size={16} className="shrink-0 text-emerald-300" />
            Nothing broke or ran hot at this load.
          </p>
        ) : (
          <section>
            <H>What happened, and what would help</H>
            <ul className="space-y-2">
              {report.advice.map((a, i) => (
                <li
                  key={i}
                  className={clsx(
                    "rounded-xl px-3 py-2.5 text-[13px] leading-relaxed",
                    a.severity === "error"
                      ? "bg-rose-400/[0.08]"
                      : "bg-amber-300/[0.07]",
                  )}
                >
                  <div className="flex gap-2">
                    {a.severity === "error" ? (
                      <CircleAlert
                        size={15}
                        className="mt-0.5 shrink-0 text-rose-300"
                      />
                    ) : (
                      <TriangleAlert
                        size={15}
                        className="mt-0.5 shrink-0 text-amber-300"
                      />
                    )}
                    <div className="min-w-0 space-y-1">
                      <p className="text-slate-100">
                        <Rich text={a.why} provider={provider} />
                      </p>
                      <p className="text-slate-300">
                        <span className="font-semibold text-cyan-200">
                          Fix:{" "}
                        </span>
                        <Rich text={a.fix} provider={provider} />
                      </p>
                      {a.consider && (
                        <p className="text-slate-400">
                          <span className="font-semibold text-slate-300">
                            Consider:{" "}
                          </span>
                          <Rich text={a.consider} provider={provider} />
                        </p>
                      )}
                      {a.concept && (
                        <button
                          type="button"
                          onClick={() => a.concept && onConcept(a.concept)}
                          className="text-[12px] text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
                        >
                          <Rich
                            text={CONCEPTS[a.concept].title}
                            provider={provider}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <H>Also worth knowing</H>
          <ul className="space-y-1.5">
            {report.notes.map((n, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-slate-300">
                <span className="font-mono text-cyan-300/80">•</span>
                <span>
                  <Rich text={n} provider={provider} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Modal>
  )
}
