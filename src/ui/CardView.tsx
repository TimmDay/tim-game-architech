import { MessageSquareQuote } from "lucide-react"
import type { Card } from "~/levels/concepts"
import { serviceName, type Provider } from "~/providers/names"
import type { ComponentKind } from "~/sim/types"
import { MiniBlock } from "./MiniBlock"
import { Rich } from "./Rich"

export function CardView({
  card,
  provider,
  kind,
}: {
  card: Card
  provider: Provider
  kind?: ComponentKind
}) {
  const generic = kind ? serviceName(kind, "generic").name : undefined
  const full = kind ? serviceName(kind, provider).name : undefined
  return (
    <div>
      <div className="flex items-center gap-3">
        {kind && <MiniBlock kind={kind} size={56} />}
        <div>
          <h3 className="font-display text-lg leading-tight font-bold text-white">
            {kind ? full : <Rich text={card.title} provider={provider} />}
          </h3>
          {kind && provider !== "generic" && (
            <div className="text-[12px] text-slate-500">{generic}</div>
          )}
        </div>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-slate-300">
        <Rich text={card.body} provider={provider} />
      </p>
      <div className="mt-3 flex gap-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/[0.06] p-3 text-[13px] leading-relaxed text-fuchsia-50/90">
        <MessageSquareQuote
          size={16}
          className="mt-0.5 shrink-0 text-fuchsia-300"
        />
        <span>
          <span className="font-semibold text-fuchsia-200">
            In the interview:{" "}
          </span>
          <Rich text={card.interview} provider={provider} />
        </span>
      </div>
    </div>
  )
}
