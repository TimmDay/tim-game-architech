import type { ComponentKind } from "~/sim/types"
import { Block } from "./Block"

export function MiniBlock({
  kind,
  size = 44,
}: {
  kind: ComponentKind
  size?: number
}) {
  return (
    <svg viewBox="-32 -48 64 64" width={size} height={size} aria-hidden>
      <Block
        kind={kind}
        instances={kind === "app-server" || kind === "worker" ? 2 : 1}
      />
    </svg>
  )
}
