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

let uid: string | null = null
const listeners = new Set<() => void>()

export const currentProfile = () => uid

/** The storage key for this player's copy of `key`. */
export function scoped(key: string, profile: string | null = uid): string {
  if (!profile || !isPerPlayer(key)) return key
  return `lb.u.${profile}.${key.slice("lb.".length)}`
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

/** Minimal storage surface, so the claim logic can be tested without a browser. */
export type KeyValue = {
  length: number
  key(i: number): string | null
  getItem(k: string): string | null
  setItem(k: string, v: string): void
}

/**
 * The first time an account signs in on a device, carry the guest save into
 * it, so nothing earned before signing up is lost. An account that already
 * has data on this device is left alone. Returns how many keys were copied.
 */
export function claimGuestData(store: KeyValue, profile: string): number {
  const keys: string[] = []
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i)
    if (k) keys.push(k)
  }
  const accountHasData = keys.some((k) => k.startsWith(`lb.u.${profile}.`))
  if (accountHasData) return 0
  let copied = 0
  for (const k of keys) {
    if (!isPerPlayer(k)) continue
    const v = store.getItem(k)
    if (v === null) continue
    store.setItem(scoped(k, profile), v)
    copied++
  }
  return copied
}
