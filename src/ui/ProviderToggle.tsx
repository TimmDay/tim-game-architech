import clsx from "clsx"
import { PROVIDERS, type Provider } from "~/providers/names"

const ACCENT: Record<Provider, string> = {
  aws: "bg-amber-400 text-slate-950",
  azure: "bg-sky-400 text-slate-950",
  gcp: "bg-emerald-400 text-slate-950",
  generic: "bg-slate-200 text-slate-950",
}

/** Renames every component in the game to that provider's product. */
export function ProviderToggle({
  value,
  onChange,
}: {
  value: Provider
  onChange: (p: Provider) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Cloud provider naming"
      className="flex rounded-full border border-white/10 bg-slate-900/70 p-0.5 font-mono text-[11px] backdrop-blur"
    >
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={value === p.id}
          onClick={() => onChange(p.id)}
          className={clsx(
            "rounded-full px-2.5 py-1 font-semibold tracking-wide transition-colors sm:px-3",
            value === p.id ? ACCENT[p.id] : "text-slate-400 hover:text-white",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
