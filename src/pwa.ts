import { useSyncExternalStore } from "react"
import { registerSW } from "virtual:pwa-register"

/**
 * The installed-app side of the game: a new version waiting to load, and the
 * browser's offer to install. Both can arrive before React has mounted, so
 * they're captured here at start-up and read through hooks.
 */

/** Chrome's install prompt event, which TypeScript's DOM types don't include. */
type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let updateReady = false
let installPrompt: InstallPrompt | null = null
let applyUpdateFn: ((reload?: boolean) => Promise<void>) | undefined
const listeners = new Set<() => void>()
const notify = () => {
  for (const l of listeners) l()
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function startPwa() {
  // Ask before updating: a silent reload could interrupt someone mid-level.
  applyUpdateFn = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true
      notify()
    },
  })
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    installPrompt = e as InstallPrompt
    notify()
  })
  window.addEventListener("appinstalled", () => {
    installPrompt = null
    notify()
  })
}

/** A new version has downloaded and is waiting for a reload. */
export const useUpdateReady = () =>
  useSyncExternalStore(subscribe, () => updateReady)

/** Load the new version now. */
export const applyUpdate = () => applyUpdateFn?.(true)

/** The browser will install the app if asked (Chrome, Edge, Android). */
export const useCanInstall = () =>
  useSyncExternalStore(subscribe, () => installPrompt !== null)

/** Show the browser's install dialog. Resolves true if the player accepted. */
export async function install(): Promise<boolean> {
  const p = installPrompt
  if (!p) return false
  await p.prompt()
  const { outcome } = await p.userChoice
  installPrompt = null
  notify()
  return outcome === "accepted"
}

/** Already running as an installed app. */
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * iPhone and iPad Safari never offer to install: it's Share, then Add to Home
 * Screen. iPadOS reports itself as a Mac, so touch support gives it away.
 */
export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
