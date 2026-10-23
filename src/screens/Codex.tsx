import clsx from "clsx"
import { ChevronLeft } from "lucide-react"
import { useState } from "react"
import { COMPONENT_CARDS, CONCEPTS } from "~/levels/concepts"
import type { Provider } from "~/providers/names"
import { KINDS } from "~/sim/catalogue"
import { CardView } from "~/ui/CardView"

/** Every component and concept card, renamed by the provider toggle. */
export function Codex({
  provider,
  onBack,
}: {
  provider: Provider
  onBack: () => void
}) {
  const [tab, setTab] = useState<"components" | "concepts">("components")
  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-[13px] text-slate-400 hover:text-white"
      >
        <ChevronLeft size={16} /> Back
      </button>
      <h1 className="font-display mt-2 text-3xl font-bold text-white">Codex</h1>
      <p className="mt-1 text-[14px] text-slate-400">
        What every block is for, and what an interviewer wants to hear about it.
        Switch provider at the top to see each cloud's name for it.
      </p>
      <div className="mt-4 inline-flex rounded-full border border-white/10 p-0.5 text-[13px]">
        {(["components", "concepts"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx(
              "rounded-full px-4 py-1.5 capitalize",
              tab === t ? "bg-white text-slate-950" : "text-slate-400",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {tab === "components"
          ? KINDS.map((k) => (
              <article
                key={k}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
              >
                <CardView
                  card={COMPONENT_CARDS[k]}
                  provider={provider}
                  kind={k}
                />
              </article>
            ))
          : Object.entries(CONCEPTS).map(([id, c]) => (
              <article
                key={id}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
              >
                <CardView card={c} provider={provider} />
              </article>
            ))}
      </div>
    </main>
  )
}
