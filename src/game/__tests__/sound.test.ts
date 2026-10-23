import { expect, it } from "vitest"
import { setHum, setMuted, sfx, stopHum } from "../sound"

it("is silent, not broken, where there is no audio device", () => {
  expect(() => {
    for (const play of Object.values(sfx)) play(0)
    setHum(1)
    stopHum()
    setMuted(true)
    sfx.place()
    setMuted(false)
  }).not.toThrow()
})
