import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The sync loop against a fake Firestore that, like the real one, echoes
 * every write back through onSnapshot with map keys in its own order. An
 * idle session must not keep writing.
 */
type Snap = {
  exists: () => boolean
  data: () => unknown
  metadata: { hasPendingWrites: boolean }
}
const fake = {
  stored: undefined as unknown,
  writes: 0,
  listener: undefined as ((s: Snap) => void) | undefined,
}
const reorder = (v: unknown): unknown =>
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(
        Object.entries(v)
          .reverse()
          .map(([k, x]) => [k, reorder(x)]),
      )
    : v
const snap = (): Snap => ({
  exists: () => fake.stored !== undefined,
  data: () => reorder(JSON.parse(JSON.stringify(fake.stored))),
  metadata: { hasPendingWrites: false },
})

vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  doc: () => ({}),
  serverTimestamp: () => "now",
  getDoc: async () => snap(),
  setDoc: async (_ref: unknown, data: unknown) => {
    fake.writes++
    fake.stored = data
    // The server confirms, and listeners hear about it.
    queueMicrotask(() => fake.listener?.(snap()))
  },
  onSnapshot: (_ref: unknown, next: (s: Snap) => void) => {
    fake.listener = next
    return () => {
      fake.listener = undefined
    }
  },
}))

describe("cloud sync", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    fake.stored = undefined
    fake.writes = 0
  })
  afterEach(() => vi.useRealTimers())

  it("writes once for a change, then stays quiet while idle", async () => {
    const { startSync, stopSync } = await import("../cloud")
    const { switchProfile } = await import("~/game/profile")
    const { updateReview } = await import("~/game/points-store")
    const { passScenario } = await import("~/game/review")

    switchProfile("u1")
    await startSync({} as never, "u1", [])
    await vi.advanceTimersByTimeAsync(10_000)
    const afterStart = fake.writes

    updateReview((s) => passScenario(s, "front-page", Date.now()))
    await vi.advanceTimersByTimeAsync(5_000)
    expect(fake.writes).toBe(afterStart + 1)

    // A minute of doing nothing: no more writes.
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fake.writes).toBe(afterStart + 1)
    stopSync()
  })

  it("batches a burst of changes into one write", async () => {
    const { startSync, stopSync } = await import("../cloud")
    const { switchProfile } = await import("~/game/profile")
    const { updateReview } = await import("~/game/points-store")
    const { seeCard } = await import("~/game/review")

    switchProfile("u2")
    await startSync({} as never, "u2", [])
    await vi.advanceTimersByTimeAsync(10_000)
    const before = fake.writes
    for (let i = 0; i < 5; i++)
      updateReview((s) => seeCard(s, `c:${i}`, true, Date.now()))
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fake.writes).toBe(before + 1)
    stopSync()
  })
})
