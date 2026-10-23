import { describe, expect, it } from "vitest"
import { LIVES, canLaunch, playWave, wave } from "../engine"
import { naive, sensible } from "./players"

/** Play a whole run with a fixed strategy; returns the wave it ended on. */
function run(
  seed: number,
  player: (w: ReturnType<typeof wave>) => ReturnType<typeof naive>,
) {
  let lives = LIVES
  let n = 0
  while (lives > 0 && n < 40) {
    n++
    const w = wave(seed, n)
    const g = player(w)
    if (!canLaunch(g, w) || !playWave(g, w).survived) lives--
  }
  return n
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]

describe("survival balance", () => {
  it("lets a sensible design reach wave 10 or more on every seed", () => {
    for (const seed of SEEDS)
      expect(run(seed, sensible), `seed ${seed}`).toBeGreaterThanOrEqual(10)
  })

  it("ends a starter stack that never grows within a few waves", () => {
    for (const seed of SEEDS)
      expect(run(seed, naive), `seed ${seed}`).toBeLessThanOrEqual(7)
  })

  it("eventually beats everyone: there's no infinite strategy", () => {
    for (const seed of SEEDS) expect(run(seed, sensible)).toBeLessThan(40)
  })
})

describe("waves", () => {
  it("are the same for the same seed", () => {
    expect(wave(42, 9)).toEqual(wave(42, 9))
  })

  it("grow traffic and budget every wave", () => {
    for (let n = 1; n < 15; n++) {
      expect(wave(1, n + 1).load.peakRps).toBeGreaterThan(
        wave(1, n).load.peakRps,
      )
      expect(wave(1, n + 1).budget).toBeGreaterThan(wave(1, n).budget)
    }
  })

  it("start calm: no incidents before wave 3, no upload floods before wave 4", () => {
    for (const seed of SEEDS) {
      expect(wave(seed, 1).incidents).toEqual([])
      expect(wave(seed, 2).incidents).toEqual([])
      for (const n of [1, 2, 3]) expect(wave(seed, n).mix).not.toBe("uploads")
    }
  })

  it("throws two incidents at once from wave 7", () => {
    expect(wave(3, 7).incidents).toHaveLength(2)
  })
})
