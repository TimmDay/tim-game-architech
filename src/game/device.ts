/**
 * A random id for this browser, so per-device tallies can be merged across
 * devices. Not personal data and not shared with anyone but the player's own
 * save. Device-wide: it survives signing in and out.
 */
const KEY = "lb.device"
let id: string | null = null

export function deviceId(): string {
  if (id) return id
  try {
    id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID().slice(0, 8)
      localStorage.setItem(KEY, id)
    }
  } catch {
    id = "local"
  }
  return id
}
