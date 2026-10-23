import { useSyncExternalStore } from "react"

/**
 * Every sound in the game, synthesised with WebAudio: no asset files to load
 * or cache offline.
 *
 * Audio must never break a screen. The context is created lazily on the first
 * sound (browsers only allow it after a user gesture, and iOS needs a resume),
 * and every call is wrapped so a missing or blocked AudioContext, as in tests,
 * is simply silent.
 */
const MUTE_KEY = "lb.muted"

let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1"
  } catch {
    return false
  }
})()
const listeners = new Set<() => void>()

export const isMuted = () => muted
export function setMuted(m: boolean) {
  muted = m
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0")
  } catch {
    // Not persisted; still muted for this session.
  }
  if (m) stopHum()
  for (const l of listeners) l()
}
export const useMuted = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    isMuted,
    isMuted,
  )

let ctx: AudioContext | null | undefined
function audio(): AudioContext | null {
  if (muted) return null
  try {
    if (ctx === undefined) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      ctx = AC ? new AC() : null
    }
    if (ctx?.state === "suspended") void ctx.resume()
    return ctx
  } catch {
    ctx = null
    return null
  }
}

type Tone = {
  freq: number
  to?: number
  dur: number
  type?: OscillatorType
  gain?: number
  delay?: number
}

function tone({ freq, to, dur, type = "sine", gain = 0.12, delay = 0 }: Tone) {
  const a = audio()
  if (!a) return
  try {
    const t = a.currentTime + delay
    const osc = a.createOscillator()
    const amp = a.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
    amp.gain.setValueAtTime(0.0001, t)
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01)
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(amp).connect(a.destination)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  } catch {
    // Silent on failure.
  }
}

function noise(dur: number, gain = 0.08, delay = 0) {
  const a = audio()
  if (!a) return
  try {
    const len = Math.floor(a.sampleRate * dur)
    const buf = a.createBuffer(1, len, a.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = a.createBufferSource()
    const amp = a.createGain()
    src.buffer = buf
    amp.gain.value = gain
    src.connect(amp).connect(a.destination)
    src.start(a.currentTime + delay)
  } catch {
    // Silent on failure.
  }
}

export const sfx = {
  place: () => {
    tone({ freq: 520, to: 880, dur: 0.12, type: "triangle", gain: 0.1 })
    noise(0.05, 0.04)
  },
  connect: () => {
    tone({ freq: 300, to: 1400, dur: 0.16, type: "sawtooth", gain: 0.05 })
    tone({ freq: 1200, dur: 0.08, type: "sine", gain: 0.06, delay: 0.12 })
  },
  remove: () =>
    tone({ freq: 400, to: 120, dur: 0.2, type: "square", gain: 0.05 }),
  click: () => tone({ freq: 900, dur: 0.04, type: "square", gain: 0.03 }),
  siren: () => {
    for (let i = 0; i < 3; i++) {
      tone({
        freq: 620,
        to: 920,
        dur: 0.28,
        type: "sawtooth",
        gain: 0.06,
        delay: i * 0.56,
      })
      tone({
        freq: 920,
        to: 620,
        dur: 0.28,
        type: "sawtooth",
        gain: 0.06,
        delay: i * 0.56 + 0.28,
      })
    }
    noise(0.4, 0.06)
  },
  /** The nth star of a result lands. */
  star: (n: number) => {
    const notes = [660, 880, 1320]
    tone({ freq: notes[n] ?? 1320, dur: 0.35, type: "triangle", gain: 0.12 })
    tone({
      freq: (notes[n] ?? 1320) * 2,
      dur: 0.25,
      type: "sine",
      gain: 0.04,
      delay: 0.02,
    })
  },
  fanfare: () => {
    ;[523, 659, 784, 1047].forEach((f, i) =>
      tone({
        freq: f,
        dur: 0.3,
        type: "triangle",
        gain: 0.1,
        delay: 0.5 + i * 0.09,
      }),
    )
  },
  fail: () => {
    tone({ freq: 220, to: 110, dur: 0.5, type: "sawtooth", gain: 0.07 })
    tone({
      freq: 165,
      to: 82,
      dur: 0.6,
      type: "sawtooth",
      gain: 0.05,
      delay: 0.15,
    })
  },
  coin: () => {
    tone({ freq: 988, dur: 0.07, type: "square", gain: 0.05 })
    tone({ freq: 1319, dur: 0.22, type: "square", gain: 0.05, delay: 0.07 })
  },
  correct: () => {
    tone({ freq: 784, dur: 0.1, type: "triangle", gain: 0.09 })
    tone({ freq: 1175, dur: 0.18, type: "triangle", gain: 0.09, delay: 0.08 })
  },
  wrong: () =>
    tone({ freq: 196, to: 150, dur: 0.25, type: "square", gain: 0.05 }),
  /** A block has just been overwhelmed. */
  crunch: () => noise(0.18, 0.07),
}

// --- the traffic hum: a drone whose pitch follows load ---------------------
let hum: { osc: OscillatorNode; amp: GainNode; lfo: OscillatorNode } | null =
  null

/** Start or retune the hum. `load` is traffic as a share of peak (0 to 2). */
export function setHum(load: number) {
  const a = audio()
  if (!a) return
  try {
    if (!hum) {
      const osc = a.createOscillator()
      const amp = a.createGain()
      const lfo = a.createOscillator()
      const lfoGain = a.createGain()
      osc.type = "sawtooth"
      lfo.frequency.value = 5
      lfoGain.gain.value = 6
      lfo.connect(lfoGain).connect(osc.frequency)
      amp.gain.value = 0.0001
      osc.connect(amp).connect(a.destination)
      osc.start()
      lfo.start()
      hum = { osc, amp, lfo }
    }
    const t = a.currentTime
    hum.osc.frequency.setTargetAtTime(55 + load * 90, t, 0.15)
    hum.amp.gain.setTargetAtTime(0.012 + Math.min(load, 2) * 0.014, t, 0.2)
  } catch {
    // Silent on failure.
  }
}

export function stopHum() {
  if (!hum || !ctx) return
  try {
    const h = hum
    h.amp.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1)
    setTimeout(() => {
      try {
        h.osc.stop()
        h.lfo.stop()
      } catch {
        // Already stopped.
      }
    }, 400)
  } catch {
    // Silent on failure.
  }
  hum = null
}
