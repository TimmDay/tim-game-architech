import { useSyncExternalStore } from "react"
import { backend, notifySaveChanged, scoped, subscribeProfile } from "./profile"
import { deviceId } from "./device"
import { EMPTY, normalize, type ReviewState } from "./review"

/**
 * The one piece of shared, live game state: points and the review schedule.
 * Persisted to localStorage, and observable so the points counter updates
 * wherever points are earned.
 */
const KEY = "lb.review"

const load = (): ReviewState => {
  try {
    const raw = backend().getItem(scoped(KEY))
    return raw
      ? normalize({ ...EMPTY, ...(JSON.parse(raw) as ReviewState) }, deviceId())
      : { ...EMPTY, retention: {} }
  } catch {
    return EMPTY
  }
}

let state: ReviewState = load()
const listeners = new Set<() => void>()

// Signing in or out swaps whose points these are.
subscribeProfile(() => {
  state = load()
  for (const l of listeners) l()
})

export const getReview = () => state

/** Apply a pure update from `review.ts`, persist it, and notify subscribers. */
export function updateReview(fn: (s: ReviewState) => ReviewState) {
  const next = fn(state)
  if (next === state) return
  state = next
  try {
    backend().setItem(scoped(KEY), JSON.stringify(state))
  } catch {
    // Storage blocked: points still count for this session.
  }
  for (const l of listeners) l()
  notifySaveChanged()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useReview = () =>
  useSyncExternalStore(subscribe, getReview, getReview)
