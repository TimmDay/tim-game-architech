import { useSyncExternalStore } from "react"

/**
 * Whose save data we're reading. Signed out, it's the device's guest save
 * (the original `lb.*` keys). Signed in, every per-player key gets the
 * account's id in it, so two people sharing a device keep separate progress.
 *
 * Still localStorage underneath: see TODO.md for moving saves to a database.
 */

/** Keys that belong to a player. Anything else (provider, mute) is per device. */
const PER_PLAYER = [
  "lb.progress",
  "lb.build.",
  "lb.deck.",
  "lb.quiz.",
  "lb.review",
]
const isPerPlayer = (key: string) =>
  PER_PLAYER.some((p) => (p.endsWith(".") ? key.startsWith(p) : key === p))

/**
 * Who is playing:
 *   null      the original device save (no sign-in configured, or not chosen)
 *   "guest"   "continue as guest": saved in this browser, under lb.g.*, until
 *             the player signs in and it's folded into their account
 *   <uid>     a signed-in account, saved per device and synced to the cloud
 */
export const GUEST = "guest"
let uid: string | null = null
const listeners = new Set<() => void>()

export const currentProfile = () => uid

/** The storage key for this player's copy of `key`. */
export function scoped(key: string, profile: string | null = uid): string {
  if (!profile || !isPerPlayer(key)) return key
  const rest = key.slice("lb.".length)
  return profile === GUEST ? `lb.g.${rest}` : `lb.u.${profile}.${rest}`
}

/** Every save lives in localStorage, guests' included. */
export function backend(): Storage {
  return localStorage
}

/** Forget the guest save: it has just been folded into an account. */
export function clearGuestSave() {
  try {
    for (const k of Object.keys(localStorage))
      if (k.startsWith("lb.g.")) localStorage.removeItem(k)
  } catch {
    // Storage blocked: nothing was saved.
  }
}

/** Per-player keys that sync (in-progress builds stay on the device). */
export const isSynced = (key: string) =>
  isPerPlayer(key) && !key.startsWith("lb.build.")

// --- "the save changed" signal, for cloud sync -------------------------------
const changeListeners = new Set<() => void>()
export const notifySaveChanged = () => {
  for (const l of changeListeners) l()
}
export const subscribeSaveChanged = (l: () => void) => {
  changeListeners.add(l)
  return () => {
    changeListeners.delete(l)
  }
}

/** Tell every store to reload: the save was replaced underneath them (a sync). */
export const refreshProfile = () => {
  for (const l of listeners) l()
}

export function switchProfile(next: string | null) {
  if (next === uid) return
  uid = next
  for (const l of listeners) l()
}

export const subscribeProfile = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const useProfile = () =>
  useSyncExternalStore(subscribeProfile, currentProfile, currentProfile)
