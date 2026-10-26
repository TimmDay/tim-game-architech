import { describe, expect, it } from "vitest"
import { graph } from "~/levels"
import { CLIENT_ID as C } from "~/sim/types"
import { DEMANDS, LIVES, canLaunch, playWave, wave } from "../engine"
import { appsOnly, naive, sensible } from "./players"

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

describe("demands", () => {
  it("never arrive on the first two waves", () => {
    for (const seed of SEEDS) {
      expect(wave(seed, 1).demands).toEqual([])
      expect(wave(seed, 2).demands).toEqual([])
    }
  })

  it("leave a seed's traffic and incidents as they were", () => {
    for (const seed of SEEDS)
      for (let n = 1; n < 15; n++) {
        const plain = wave(seed, n, new Set())
        const w = wave(seed, n)
        expect(w.mix).toBe(plain.mix)
        expect(w.incidents).toEqual(plain.incidents)
        expect(w.load.peakRps).toBe(plain.load.peakRps)
      }
  })

  it("stay once they arrive, and say which one is new", () => {
    for (const seed of SEEDS)
      for (let n = 1; n < 15; n++) {
        const before = wave(seed, n).demands
        const after = wave(seed, n + 1)
        expect(after.demands.slice(0, before.length)).toEqual(before)
        expect(after.fresh).toBe(
          after.demands.length > before.length
            ? after.demands.at(-1)?.id
            : undefined,
        )
      }
  })

  it("come often enough that most runs meet two by wave 8", () => {
    const met = SEEDS.filter((s) => wave(s, 8).demands.length >= 2)
    expect(met.length).toBeGreaterThanOrEqual(SEEDS.length / 2)
  })

  it("wait for the level that teaches what they need", () => {
    const known = new Set(["front-page", "upload-rush"])
    for (const seed of SEEDS)
      for (let n = 1; n < 20; n++)
        for (const d of wave(seed, n, known).demands)
          expect(d.teaches).toBe("upload-rush")
  })

  it("can't be met by scaling app servers to the budget", () => {
    let seen = 0
    for (const seed of SEEDS)
      for (let n = 3; n < 15; n++) {
        const w = wave(seed, n)
        if (!w.demands.length) continue
        seen++
        const g = appsOnly(w)
        expect(
          canLaunch(g, w) && playWave(g, w).survived,
          `seed ${seed} wave ${n}`,
        ).toBe(false)
      }
    expect(seen).toBeGreaterThan(20)
  })

  it("are met by the sensible design, within budget", () => {
    for (const seed of SEEDS)
      for (let n = 1; n < 12; n++) {
        const w = wave(seed, n)
        const g = sensible(w)
        // Incidents can still cost a life; the demands themselves must not.
        const calm = { ...w, incidents: [] }
        const at = `seed ${seed} wave ${n}`
        expect(canLaunch(g, w), `${at} budget`).toBe(true)
        expect(playWave(g, calm).reasons, at).toEqual([])
        const labels = w.demands.map((d) => d.label)
        expect(
          playWave(g, w).reasons.filter((r) =>
            labels.some((l) => r.startsWith(l)),
          ),
          at,
        ).toEqual([])
      }
  })

  it("fail a warehouse on the request path", () => {
    const w = { ...wave(1, 5, new Set()), demands: [DEMANDS.analytics] }
    const g = graph(
      [
        ["lb", "load-balancer", 3, 2],
        ["app", "app-server", 5, 4, 8, 3],
        ["db", "sql-primary", 9, 3, 2, 2],
        ["dw", "data-warehouse", 9, 5],
      ],
      [`${C}>lb`, "lb>app", "app>db", "app>dw"],
    )
    expect(playWave(g, w).survived).toBe(false)
  })

  it("fail a ledger kept in one unsharded primary once writes outgrow it", () => {
    const base = wave(1, 12)
    const w = {
      ...base,
      mix: "checkout" as const,
      load: { ...base.load, readFraction: 0.6, cacheableFraction: 0.4 },
      demands: [DEMANDS.ledger],
    }
    const sharded = sensible(w)
    const single = {
      ...sharded,
      components: sharded.components.map((c) =>
        c.kind === "sql-primary" ? { ...c, shards: 1 } : c,
      ),
    }
    expect(playWave(sharded, w).survived).toBe(true)
    expect(playWave(single, w).survived).toBe(false)
  })
})
