import { useSyncExternalStore } from "react"
import { refreshProfile, subscribeSaveChanged } from "~/game/profile"
import { readSave, writeSave } from "./local"
import { fromCloud, mergeSave, sameSave, toCloud, type Save } from "./save"

/**
 * Cross-device sync: one Firestore document per player,
 * users/{uid}/save/main. Local storage stays the fast copy the game reads;
 * this keeps it and the cloud merged.
 *
 * Writes are batched: at most one every few seconds, well inside the
 * security rules' 2-second limit, and flushed when the tab is hidden.
 */
export type SyncStatus = "off" | "syncing" | "synced" | "offline" | "error"

let status: SyncStatus = "off"
const listeners = new Set<() => void>()
const setStatus = (s: SyncStatus) => {
  status = s
  for (const l of listeners) l()
}
export const useSyncStatus = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
    () => status,
  )

const PUSH_DELAY_MS = 4_000
const MIN_GAP_MS = 3_000

type Session = { stop: () => void }
let session: Session | null = null

export async function startSync(
  app: import("firebase/app").FirebaseApp,
  uid: string,
  /** Extra saves to fold in on first sync: this tab's guest play, old device data. */
  extras: Save[],
) {
  session?.stop()
  setStatus("syncing")
  const fs = await import("firebase/firestore")
  const db = fs.getFirestore(app)
  const ref = fs.doc(db, "users", uid, "save", "main")

  let lastPush = 0
  let timer: number | undefined
  let stopped = false

  const push = async () => {
    timer = undefined
    if (stopped) return
    const wait = lastPush + MIN_GAP_MS - Date.now()
    if (wait > 0) {
      timer = window.setTimeout(() => void push(), wait)
      return
    }
    lastPush = Date.now()
    setStatus("syncing")
    try {
      await fs.setDoc(ref, {
        ...toCloud(readSave(uid)),
        updatedAt: fs.serverTimestamp(),
      })
      setStatus("synced")
    } catch (e) {
      const code = (e as { code?: string }).code ?? ""
      // Throttled by the rules, or briefly offline: try again shortly.
      setStatus(code === "unavailable" ? "offline" : "error")
      timer = window.setTimeout(() => void push(), MIN_GAP_MS * 2)
    }
  }
  const schedule = () => {
    if (stopped || timer !== undefined) return
    timer = window.setTimeout(() => void push(), PUSH_DELAY_MS)
  }
  const flush = () => {
    if (document.visibilityState !== "hidden" || timer === undefined) return
    clearTimeout(timer)
    void push()
  }

  try {
    const snap = await fs.getDoc(ref)
    const remote = fromCloud(snap.data())
    const local = extras.reduce(mergeSave, readSave(uid))
    const merged = mergeSave(local, remote)
    writeSave(uid, merged)
    refreshProfile()
    if (!snap.exists() || !sameSave(merged, remote)) await push()
    else setStatus("synced")
  } catch {
    setStatus("offline")
  }

  // Other devices' changes arrive here and merge into what's on this one.
  const unsubRemote = fs.onSnapshot(
    ref,
    (s) => {
      if (s.metadata.hasPendingWrites || !s.exists()) return
      const remote = fromCloud(s.data())
      const local = readSave(uid)
      const merged = mergeSave(local, remote)
      if (!sameSave(merged, local)) {
        writeSave(uid, merged)
        refreshProfile()
      }
      if (!sameSave(merged, remote)) schedule()
    },
    () => setStatus("offline"),
  )
  const unsubLocal = subscribeSaveChanged(schedule)
  document.addEventListener("visibilitychange", flush)

  session = {
    stop: () => {
      stopped = true
      if (timer !== undefined) clearTimeout(timer)
      unsubRemote()
      unsubLocal()
      document.removeEventListener("visibilitychange", flush)
      setStatus("off")
    },
  }
}

export function stopSync() {
  session?.stop()
  session = null
}
