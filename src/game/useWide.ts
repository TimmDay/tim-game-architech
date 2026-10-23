import { useSyncExternalStore } from "react"

const QUERY = "(min-width: 1024px)"

/** Desktop gets side panels; phones get a bottom sheet. */
export function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(QUERY)
      m.addEventListener("change", cb)
      return () => m.removeEventListener("change", cb)
    },
    () => window.matchMedia(QUERY).matches,
    () => true,
  )
}
