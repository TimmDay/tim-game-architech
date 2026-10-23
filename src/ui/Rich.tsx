import type { Provider } from "~/providers/names"
import { CATALOGUE } from "~/sim/catalogue"
import { segments } from "~/text"
import { CATEGORY_HUE } from "./iso"

/** Game text with `{kind}` tokens rendered as the current provider's names. */
export function Rich({ text, provider }: { text: string; provider: Provider }) {
  return (
    <>
      {segments(text, provider).map((s, i) =>
        s.kind ? (
          <span
            key={i}
            className="font-semibold"
            style={{
              color: `hsl(${CATEGORY_HUE[CATALOGUE[s.kind].category]} 95% 72%)`,
            }}
          >
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  )
}
