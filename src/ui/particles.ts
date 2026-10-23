import { useEffect, useRef } from "react"

export type ParticleFlow = {
  id: string
  a: { sx: number; sy: number }
  b: { sx: number; sy: number }
  rps: number
  color: string
  /** Target is overloaded: some packets burst at the far end instead of arriving. */
  drop: boolean
}

/** Hard ceiling so a mid-range phone keeps a steady frame rate. */
const MAX_PARTICLES = 180
const SPEED = 140 // world px per second
const NS = "http://www.w3.org/2000/svg"

/**
 * Packets travelling along edges, at a rate that grows with the log of the
 * edge's real request rate. Drawn imperatively into one <g>, so the 60fps loop
 * never re-renders React.
 */
export function useParticles(flows: ParticleFlow[]) {
  const layer = useRef<SVGGElement>(null)
  const flowsRef = useRef(flows)
  useEffect(() => {
    flowsRef.current = flows
  }, [flows])

  useEffect(() => {
    const g = layer.current
    if (!g) return
    type P = {
      el: SVGCircleElement
      flow: string
      t: number
      len: number
      dies: boolean
    }
    const live: P[] = []
    const spawnDebt = new Map<string, number>()
    type Spark = {
      el: SVGCircleElement
      x: number
      y: number
      vx: number
      vy: number
      life: number
    }
    const sparks: Spark[] = []
    const burst = (x: number, y: number) => {
      for (let k = 0; k < 5; k++) {
        const el = document.createElementNS(NS, "circle")
        el.setAttribute("r", "1.6")
        el.setAttribute("fill", "#fda4af")
        g.appendChild(el)
        const a = Math.random() * Math.PI * 2
        const v = 40 + Math.random() * 60
        sparks.push({
          el,
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 30,
          life: 0.45,
        })
      }
    }
    let last = performance.now()
    let raf = 0
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const byId = new Map(flowsRef.current.map((f) => [f.id, f]))

      for (const f of flowsRef.current) {
        if (f.rps <= 0) continue
        // ~1.5 packets/s at 10 rps, ~8/s at 10k rps.
        const rate = reduced ? 0.6 : 1.2 * Math.log10(f.rps + 1) + 0.6
        const debt = (spawnDebt.get(f.id) ?? Math.random()) + rate * dt
        let n = Math.floor(debt)
        spawnDebt.set(f.id, debt - n)
        while (n-- > 0 && live.length < MAX_PARTICLES) {
          const el = document.createElementNS(NS, "circle")
          el.setAttribute("r", "3")
          el.setAttribute("fill", f.color)
          // A translucent stroke reads as glow and costs nothing, unlike a filter.
          el.setAttribute("stroke", f.color)
          el.setAttribute("stroke-opacity", "0.35")
          el.setAttribute("stroke-width", "4")
          g.appendChild(el)
          const len = Math.hypot(f.b.sx - f.a.sx, f.b.sy - f.a.sy)
          live.push({
            el,
            flow: f.id,
            t: 0,
            len,
            dies: f.drop && Math.random() < 0.45,
          })
        }
      }

      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i]
        if (!p) continue
        const f = byId.get(p.flow)
        const end = p.dies ? 0.8 : 1
        if (!f) {
          p.el.remove()
          live.splice(i, 1)
          continue
        }
        p.t += (SPEED * dt) / Math.max(1, p.len)
        if (p.t >= end) {
          // A packet that dies at an overloaded block bursts into sparks.
          if (p.dies && !reduced && live.length + sparks.length < MAX_PARTICLES)
            burst(
              f.a.sx + (f.b.sx - f.a.sx) * p.t,
              f.a.sy + (f.b.sy - f.a.sy) * p.t,
            )
          p.el.remove()
          live.splice(i, 1)
          continue
        }
        const x = f.a.sx + (f.b.sx - f.a.sx) * p.t
        const y = f.a.sy + (f.b.sy - f.a.sy) * p.t
        p.el.setAttribute("cx", x.toFixed(1))
        p.el.setAttribute("cy", y.toFixed(1))
        // Doomed packets swell and fade as they approach the overloaded target.
        if (p.dies && p.t > 0.55) {
          const k = (p.t - 0.55) / 0.25
          p.el.setAttribute("r", (3 + k * 4).toFixed(1))
          p.el.setAttribute("opacity", (1 - k).toFixed(2))
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i]
        if (!sp) continue
        sp.life -= dt
        if (sp.life <= 0) {
          sp.el.remove()
          sparks.splice(i, 1)
          continue
        }
        sp.vy += 160 * dt
        sp.x += sp.vx * dt
        sp.y += sp.vy * dt
        sp.el.setAttribute("cx", sp.x.toFixed(1))
        sp.el.setAttribute("cy", sp.y.toFixed(1))
        sp.el.setAttribute("opacity", (sp.life / 0.45).toFixed(2))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      for (const p of live) p.el.remove()
      for (const sp of sparks) sp.el.remove()
    }
  }, [])

  return layer
}
