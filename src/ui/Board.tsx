import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { COLS, ROWS, clientTile, inBounds, occupied } from "~/game/edit"
import { CLIENT_NAME, serviceName, type Provider } from "~/providers/names"
import { carries } from "~/sim/simulate"
import type { Action } from "~/game/edit"
import type { Graph, SimResult } from "~/sim/types"
import { CLIENT_ID, type TrafficType } from "~/sim/types"
import { Block, ClientBlock } from "./Block"
import { NoteCard } from "./NoteCard"
import { edgeLabel, nodeLabel } from "./boardLabels"
import { TH, TW, diamond, iso, tileAt } from "./iso"
import { useParticles } from "./particles"

export type BoardProps = {
  graph: Graph
  provider: Provider
  result?: SimResult
  /** Traffic is flowing: colour blocks by health and animate packets. */
  live: boolean
  selectedId?: string
  selectedEdgeId?: string
  flaggedId?: string
  /** Highlight free tiles, because a component is waiting to be placed. */
  placing: boolean
  connectingFrom?: string
  onTapNode: (id: string) => void
  onTapEdge: (id: string) => void
  onTapTile: (x: number, y: number) => void
  onMove: (id: string, x: number, y: number) => void
  /** The level's traffic types, for the legend. */
  traffic?: TrafficType[]
  /**
   * Phones, on the build tab: a + on each component starts a connection
   * from it, and an = on each valid target finishes it.
   */
  handles?: {
    /** The component a connection is being drawn from, if any. */
    from?: string
    canReceive: (id: string) => boolean
    onStart: (id: string) => void
    onReceive: (id: string) => void
  }
  /** The player's notes. Unset hides them (while a test runs). */
  notes?: {
    /** A click, or Enter for the top left, puts a note down. */
    placing: boolean
    /** Phones: shown, but not editable. */
    readOnly: boolean
    editing: string | null
    onPlace: (x: number, y: number) => void
    onEdit: (id: string | null) => void
    dispatch: (a: Action) => void
  }
}

const ALL_COLOR = "#38bdf8"
const READS_COLOR = "#c084fc"
const WRITES_COLOR = "#fbbf24"
const TYPED_COLOR = "#2dd4bf"

type View = { x: number; y: number; k: number }
type Pt = { x: number; y: number }

const TAP_SLOP = 8

/** Where T then Enter puts a note: in from the view's top left, cascading. */
const NOTE_INSET = 16
const NOTE_CASCADE = 24

/**
 * Arrow keys step along the grid. Each axis runs diagonally on screen, so
 * each key takes the axis whose screen direction shares its own: Right goes
 * down-right, Up goes up-right.
 */
const STEPS: Record<string, Pt> = {
  ArrowRight: { x: 1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowDown: { x: 0, y: 1 },
  ArrowUp: { x: 0, y: -1 },
}

/** A synthetic click: a screen reader activating an element, not a pointer. */
const fromAssistiveTech = (e: React.MouseEvent) => e.detail === 0

function nodePos(graph: Graph, id: string) {
  if (id === CLIENT_ID) {
    const u = clientTile(graph)
    return iso(u.x, u.y)
  }
  const c = graph.components.find((c) => c.id === id)
  return c ? iso(c.x, c.y) : undefined
}

export function Board(p: BoardProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setRawView] = useState<View>({ x: 0, y: 0, k: 1 })
  const sizeRef = useRef(size)
  /** Every pan and zoom goes through here, so the grid is never lost. */
  const setView = useCallback(
    (v: View, w = sizeRef.current.w, h = sizeRef.current.h) =>
      setRawView(clampView(v, w, h)),
    [],
  )
  const [hover, setHover] = useState<Pt | null>(null)
  /** The keyboard's tile while placing, and whether to draw it. */
  const [cursor, setCursor] = useState<Pt | null>(null)
  const [cursorShown, setCursorShown] = useState(false)
  /** The component with keyboard focus, so its ring can be drawn. */
  const [focused, setFocused] = useState<string | null>(null)
  const fitted = useRef(false)

  // Frame the part of the board in use, not all of it: blocks should be big
  // enough to tap on a phone.
  const graphRef = useRef(p.graph)
  useEffect(() => {
    graphRef.current = p.graph
  }, [p.graph])
  const fit = useCallback(
    (w: number, h: number) => {
      const g = graphRef.current
      // An empty board still frames a few tiles' room to build in.
      const pts = [
        iso(clientTile(g).x, clientTile(g).y),
        iso(6, 2),
        iso(6, 6),
        ...g.components.map((c) => iso(c.x, c.y)),
        // A note's corner, and roughly where its card ends.
        ...(g.notes ?? []).flatMap((n) => [
          { sx: n.x, sy: n.y + 70 },
          { sx: n.x + 160, sy: n.y + 110 },
        ]),
      ]
      const left = Math.min(...pts.map((c) => c.sx)) - TW
      const right = Math.max(...pts.map((c) => c.sx)) + TW
      const top = Math.min(...pts.map((c) => c.sy)) - 70
      const bottom = Math.max(...pts.map((c) => c.sy)) + 50
      const k = clampK(
        Math.min(1.5, (w - 24) / (right - left), (h - 24) / (bottom - top)),
      )
      setView(
        {
          k,
          x: w / 2 - ((left + right) / 2) * k,
          y: h / 2 - ((top + bottom) / 2) * k,
        },
        w,
        h,
      )
    },
    [setView],
  )

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ w: width, h: height })
      sizeRef.current = { w: width, h: height }
      if (!fitted.current && width > 0) {
        fitted.current = true
        fit(width, height)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit])

  // Picking something to place hands the keyboard to the board, starting
  // beside the users. The cursor shows only for keyboard players: after a
  // mouse click, the focus isn't :focus-visible.
  const [wasPlacing, setWasPlacing] = useState(p.placing)
  if (wasPlacing !== p.placing) {
    setWasPlacing(p.placing)
    setCursor(null)
    setCursorShown(false)
  }
  const notePlacing = p.notes?.placing ?? false
  useEffect(() => {
    if (p.placing || notePlacing) wrap.current?.focus({ preventScroll: true })
  }, [p.placing, notePlacing])
  const tile = p.placing ? (cursor ?? nearestFree(p.graph)) : null

  /** In from the view's top left, stepping past any note already there. */
  const topLeftNote = () => {
    const at = { x: NOTE_INSET, y: NOTE_INSET }
    const taken = (pt: Pt) =>
      (p.graph.notes ?? []).some(
        (n) =>
          Math.abs(view.x + n.x * view.k - pt.x) < NOTE_CASCADE / 2 &&
          Math.abs(view.y + n.y * view.k - pt.y) < NOTE_CASCADE / 2,
      )
    while (taken(at) && at.y < size.h / 2) {
      at.x += NOTE_CASCADE
      at.y += NOTE_CASCADE
    }
    return toWorld(at)
  }

  const onBoardKey = (e: React.KeyboardEvent) => {
    if (notePlacing && e.target === e.currentTarget && e.key === "Enter") {
      e.preventDefault()
      const w = topLeftNote()
      p.notes?.onPlace(w.x, w.y)
      return
    }
    if (!tile) return
    const step = STEPS[e.key]
    if (step) {
      e.preventDefault()
      setCursorShown(true)
      const next = { x: tile.x + step.x, y: tile.y + step.y }
      if (inBounds(next.x, next.y)) setCursor(next)
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      p.onTapTile(tile.x, tile.y)
    }
  }

  /** Keys on a focused component: Enter selects, Shift+arrows move it. */
  const onNodeKey = (e: React.KeyboardEvent, id: string, at: Pt) => {
    const step = STEPS[e.key]
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      e.stopPropagation()
      p.onTapNode(id)
    } else if (step && e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      p.onMove(id, at.x + step.x, at.y + step.y)
      // Moving re-sorts the blocks for painting, which can drop the focus.
      requestAnimationFrame(() =>
        wrap.current
          ?.querySelector<SVGGElement>(`[data-node="${CSS.escape(id)}"]`)
          ?.focus({ preventScroll: true }),
      )
    }
  }

  const focusProps = (id: string, label: string, at: Pt) => ({
    tabIndex: 0,
    role: "button",
    "aria-label": label,
    className: "cursor-pointer outline-none",
    onKeyDown: (e: React.KeyboardEvent) => onNodeKey(e, id, at),
    onClick: (e: React.MouseEvent) => fromAssistiveTech(e) && p.onTapNode(id),
    onFocus: (e: React.FocusEvent) =>
      setFocused(e.currentTarget.matches(":focus-visible") ? id : null),
    onBlur: () => setFocused((f) => (f === id ? null : f)),
  })

  // --- gestures -----------------------------------------------------------
  const pointers = useRef(new Map<number, Pt>())
  const gesture = useRef<{
    start: Pt
    view: View
    target?: { handle?: string; node?: string; edge?: string }
    moved: boolean
    pinch?: { dist: number; mid: Pt; view: View }
    lastTile?: string
  } | null>(null)

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = wrap.current?.getBoundingClientRect()
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }
  }
  const toWorld = (pt: Pt, v: View = view): Pt => ({
    x: (pt.x - v.x) / v.k,
    y: (pt.y - v.y) / v.k,
  })

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    const pt = local(e)
    pointers.current.set(e.pointerId, pt)
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [Pt, Pt]
      gesture.current = {
        start: pt,
        view,
        moved: true,
        pinch: {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          view,
        },
      }
      return
    }
    const el = (e.target as Element).closest(
      "[data-handle],[data-node],[data-edge]",
    )
    gesture.current = {
      start: pt,
      view,
      moved: false,
      target: el
        ? {
            handle: el.getAttribute("data-handle") ?? undefined,
            node: el.getAttribute("data-node") ?? undefined,
            edge: el.getAttribute("data-edge") ?? undefined,
          }
        : undefined,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const pt = local(e)
    if (e.pointerType === "mouse" && p.placing) {
      const w = toWorld(pt)
      const t = tileAt(w.x, w.y)
      setHover(inBounds(t.x, t.y) ? t : null)
    }
    const g = gesture.current
    if (!g || !pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, pt)

    if (g.pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()] as [Pt, Pt]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const k = clampK((g.pinch.view.k * dist) / Math.max(1, g.pinch.dist))
      const anchor = toWorld(g.pinch.mid, g.pinch.view)
      setView({ k, x: mid.x - anchor.x * k, y: mid.y - anchor.y * k })
      return
    }

    if (!g.moved && Math.hypot(pt.x - g.start.x, pt.y - g.start.y) > TAP_SLOP)
      g.moved = true
    if (!g.moved) return

    if (g.target?.node) {
      const w = toWorld(pt)
      // Grab the block near its base, not the cursor's exact spot.
      const t = tileAt(w.x, w.y + 14)
      const key = `${t.x},${t.y}`
      if (key !== g.lastTile) {
        g.lastTile = key
        p.onMove(g.target.node, t.x, t.y)
      }
    } else {
      setView({
        ...g.view,
        x: g.view.x + pt.x - g.start.x,
        y: g.view.y + pt.y - g.start.y,
      })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current
    pointers.current.delete(e.pointerId)
    if (pointers.current.size > 0) {
      // Lifting one finger of a pinch: continue as a pan from here.
      const [rest] = [...pointers.current.values()] as [Pt]
      gesture.current = { start: rest, view, moved: true }
      return
    }
    gesture.current = null
    if (!g || g.moved) return
    if (p.notes?.placing) {
      // A note can go anywhere, over a component included.
      const w = toWorld(local(e))
      return p.notes.onPlace(w.x, w.y)
    }
    if (g.target?.handle) {
      const [kind, id = ""] = g.target.handle.split(":")
      return kind === "start"
        ? p.handles?.onStart(id)
        : p.handles?.onReceive(id)
    }
    if (g.target?.node) return p.onTapNode(g.target.node)
    if (g.target?.edge) return p.onTapEdge(g.target.edge)
    const w = toWorld(local(e))
    const t = tileAt(w.x, w.y)
    p.onTapTile(t.x, t.y)
  }

  const onWheel = (e: React.WheelEvent) => {
    const pt = local(e)
    const k = clampK(view.k * Math.exp(-e.deltaY * 0.0015))
    const anchor = toWorld(pt)
    setView({ k, x: pt.x - anchor.x * k, y: pt.y - anchor.y * k })
  }

  // Wheel and touch defaults must be cancelled natively (React's are passive).
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const stop = (e: Event) => e.preventDefault()
    el.addEventListener("wheel", stop, { passive: false })
    return () => el.removeEventListener("wheel", stop)
  }, [])

  // --- drawing ------------------------------------------------------------
  const tiles = useMemo(() => {
    const out: { x: number; y: number }[] = []
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) out.push({ x, y })
    return out
  }, [])
  const occupiedSet = new Set(p.graph.components.map((c) => `${c.x},${c.y}`))
  const users = clientTile(p.graph)
  occupiedSet.add(`${users.x},${users.y}`)

  const nameOf = (id: string) => {
    if (id === CLIENT_ID) return CLIENT_NAME.name
    const c = p.graph.components.find((c) => c.id === id)
    return c ? serviceName(c.kind, p.provider).name : id
  }

  const edges = p.graph.edges.flatMap((e) => {
    const a = nodePos(p.graph, e.from)
    const b = nodePos(p.graph, e.to)
    if (!a || !b) return []
    const c = carries(p.graph, e)
    const async = p.result?.perEdge[e.id]?.async ?? false
    const toAsync = c === "writes"
    // A level's own traffic types (signed URLs) are teal and dotted.
    const typed = e.carries?.some((x) => x !== "reads" && x !== "writes")
    const color = typed
      ? TYPED_COLOR
      : async || toAsync
        ? WRITES_COLOR
        : c === "reads"
          ? READS_COLOR
          : ALL_COLOR
    const dash = typed ? "2 5" : async || toAsync ? "7 6" : undefined
    const types = (e.carries ?? [])
      .filter((x) => x !== "reads" && x !== "writes")
      .map((id) => p.traffic?.find((t) => t.id === id)?.label ?? id)
    const label = edgeLabel(
      nameOf(e.from),
      nameOf(e.to),
      [c === "none" ? "" : c, ...types].filter(Boolean).join(", "),
    )
    return [{ e, a, b, color, dash, label }]
  })

  const particleFlows = useMemo(
    () =>
      p.live && p.result
        ? edges.map(({ e, a, b, color }) => {
            const m = p.result?.perComponent[e.to]
            const overloaded = (m?.utilization ?? 0) >= 1 && !m?.behindAsync
            return {
              id: e.id,
              a,
              b,
              rps: p.result?.perEdge[e.id]?.rps ?? 0,
              color: overloaded ? "#fb7185" : color,
              drop: overloaded,
            }
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.live, p.result, p.graph],
  )
  const particleLayer = useParticles(particleFlows)

  const nodes = [
    { id: CLIENT_ID, x: users.x, y: users.y },
    ...p.graph.components.map((c) => ({ id: c.id, x: c.x, y: c.y })),
  ].sort((a, b) => a.x + a.y - (b.x + b.y))

  return (
    <div
      ref={wrap}
      className="relative h-full w-full touch-none overflow-hidden outline-none select-none"
      role="group"
      aria-label="Board"
      tabIndex={p.placing || notePlacing ? 0 : -1}
      style={notePlacing ? { cursor: "crosshair" } : undefined}
      onKeyDown={onBoardKey}
      onFocus={(e) => {
        if (e.target === e.currentTarget)
          setCursorShown(e.currentTarget.matches(":focus-visible"))
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setHover(null)}
      onWheel={onWheel}
    >
      <svg width={size.w} height={size.h} className="block" data-board>
        <defs>
          <radialGradient id="floor" cx="50%" cy="50%" r="60%">
            <stop offset="0" stopColor="hsl(222 60% 16%)" />
            <stop offset="1" stopColor="hsl(222 60% 8%)" />
          </radialGradient>
          <marker
            id="chev"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path
              d="M 1 1 L 8 5 L 1 9"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
          </marker>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* Board slab, so the grid reads as a physical table */}
          <BoardSlab />
          {tiles.map(({ x, y }) => {
            const { sx, sy } = iso(x, y)
            const free = !occupiedSet.has(`${x},${y}`)
            const hot = hover?.x === x && hover.y === y
            return (
              <polygon
                key={`${x},${y}`}
                transform={`translate(${sx} ${sy})`}
                points={diamond(TW / 2 - 1, TH / 2 - 0.5)}
                fill={
                  p.placing && free
                    ? hot
                      ? "hsl(188 100% 60% / 0.35)"
                      : "hsl(188 100% 60% / 0.07)"
                    : "transparent"
                }
                stroke="hsl(200 80% 70% / 0.13)"
                strokeWidth={1}
              />
            )
          })}

          {tile && cursorShown && (
            <TileCursor
              at={tile}
              taken={occupiedSet.has(`${tile.x},${tile.y}`)}
            />
          )}

          {edges.map(({ e, a, b, color, dash, label }) => {
            const sel = e.id === p.selectedEdgeId
            const mx = a.sx + (b.sx - a.sx) * 0.55
            const my = a.sy + (b.sy - a.sy) * 0.55
            const rps = p.result?.perEdge[e.id]?.rps ?? 0
            const idle = p.live && rps <= 0
            return (
              <g
                key={e.id}
                data-edge={e.id}
                className="cursor-pointer outline-none"
                // Out of the tab order (the inspector lists connections),
                // but a screen reader can still find and open one.
                role="button"
                tabIndex={-1}
                aria-label={label}
                onClick={(ev) => fromAssistiveTech(ev) && p.onTapEdge(e.id)}
              >
                <line
                  x1={a.sx}
                  y1={a.sy}
                  x2={b.sx}
                  y2={b.sy}
                  stroke="transparent"
                  strokeWidth={18}
                />
                <line
                  x1={a.sx}
                  y1={a.sy}
                  x2={b.sx}
                  y2={b.sy}
                  stroke={color}
                  strokeOpacity={0.22}
                  strokeWidth={sel ? 10 : 7}
                />
                <line
                  x1={a.sx}
                  y1={a.sy}
                  x2={b.sx}
                  y2={b.sy}
                  stroke={sel ? "white" : color}
                  strokeOpacity={idle ? 0.35 : 1}
                  strokeWidth={2}
                  strokeDasharray={dash}
                  className={dash ? "march" : "edge-draw"}
                />
                <line
                  x1={a.sx + (b.sx - a.sx) * 0.5}
                  y1={a.sy + (b.sy - a.sy) * 0.5}
                  x2={mx}
                  y2={my}
                  stroke="transparent"
                  markerEnd="url(#chev)"
                />
              </g>
            )
          })}

          <g ref={particleLayer} />

          {nodes.map((n) => {
            const { sx, sy } = iso(n.x, n.y)
            if (n.id === CLIENT_ID) {
              return (
                <g
                  key={n.id}
                  data-node={n.id}
                  transform={`translate(${sx} ${sy})`}
                  {...focusProps(
                    n.id,
                    nodeLabel({
                      name: CLIENT_NAME.name,
                      selected: p.selectedId === CLIENT_ID,
                    }),
                    n,
                  )}
                >
                  <polygon
                    points={diamond(TW / 2, TH / 2)}
                    fill="transparent"
                  />
                  {focused === n.id && <FocusRing />}
                  <ClientBlock
                    selected={
                      p.selectedId === CLIENT_ID ||
                      p.connectingFrom === CLIENT_ID
                    }
                  />
                  <Label y={TH / 2 + 4} text={CLIENT_NAME.short} />
                </g>
              )
            }
            const c = p.graph.components.find((c) => c.id === n.id)
            if (!c) return null
            const m = p.result?.perComponent[c.id]
            return (
              <g
                key={c.id}
                data-node={c.id}
                transform={`translate(${sx} ${sy})`}
                {...focusProps(
                  c.id,
                  nodeLabel({
                    name: serviceName(c.kind, p.provider).name,
                    instances: c.instances,
                    shards: m?.shards,
                    utilization: p.live ? m?.utilization : undefined,
                    dead: p.live && m?.aliveInstances === 0,
                    selected: p.selectedId === c.id,
                  }),
                  n,
                )}
              >
                <polygon
                  points={diamond(TW / 2, TH / 2 + 10, -14)}
                  fill="transparent"
                />
                {focused === c.id && <FocusRing />}
                <g className="block-in">
                  <Block
                    kind={c.kind}
                    instances={c.instances}
                    shards={
                      m?.shards && m.shards > 1
                        ? {
                            n: m.shards,
                            hot:
                              p.live &&
                              (m.hotShardShare ?? 0) > 1 / m.shards + 1e-9 &&
                              m.utilization >= 1,
                            quiet: m.restShardUtilization,
                          }
                        : undefined
                    }
                    status={
                      p.live && m
                        ? {
                            utilization: m.utilization,
                            dead: m.aliveInstances === 0,
                            alive: Math.round(
                              (m.aliveInstances / c.instances) *
                                Math.min(c.instances, 4),
                            ),
                          }
                        : undefined
                    }
                    selected={
                      p.selectedId === c.id || p.connectingFrom === c.id
                    }
                    flagged={p.flaggedId === c.id}
                  />
                </g>
                <Label
                  y={TH / 2 + 4}
                  text={serviceName(c.kind, p.provider).short}
                  badge={
                    [
                      c.instances > 1 && `×${c.instances}`,
                      (m?.shards ?? 1) > 1 &&
                        c.kind === "sql-primary" &&
                        `${m?.shards} shards`,
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  stat={
                    p.live && m
                      ? Number.isFinite(m.utilization)
                        ? `${Math.round(m.utilization * 100)}%`
                        : "∞"
                      : undefined
                  }
                  hot={p.live && (m?.utilization ?? 0) >= 1}
                />
              </g>
            )
          })}

          {p.handles &&
            nodes.map((n) => {
              const h = p.handles
              if (!h) return null
              const { sx, sy } = iso(n.x, n.y)
              const drawing = h.from !== undefined
              const kind = !drawing
                ? "start"
                : n.id === h.from
                  ? "start"
                  : h.canReceive(n.id)
                    ? "receive"
                    : null
              if (!kind) return null
              const glyph = !drawing ? "+" : kind === "receive" ? "=" : "×"
              return (
                <g
                  key={`handle-${n.id}`}
                  data-handle={`${kind}:${n.id}`}
                  transform={`translate(${sx + 30} ${sy - 34})`}
                  className="cursor-pointer"
                  role="button"
                  onClick={(e) =>
                    fromAssistiveTech(e) &&
                    (kind === "start" ? h.onStart(n.id) : h.onReceive(n.id))
                  }
                  aria-label={
                    kind === "receive"
                      ? "Connect here"
                      : drawing
                        ? "Cancel connection"
                        : "Connect from here"
                  }
                >
                  {/* A generous hit area: the board is often zoomed out on a phone. */}
                  <circle r={24} fill="transparent" />
                  <circle
                    r={13}
                    fill={kind === "receive" ? "#22d3ee" : "#0f172a"}
                    stroke="#67e8f9"
                    strokeWidth={1.5}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={18}
                    fontWeight={700}
                    fill={kind === "receive" ? "#020617" : "#a5f3fc"}
                  >
                    {glyph}
                  </text>
                </g>
              )
            })}
        </g>
      </svg>
      {p.notes &&
        (p.graph.notes ?? []).map((n) => {
          const notes = p.notes
          if (!notes) return null
          return (
            <NoteCard
              key={n.id}
              note={n}
              left={view.x + n.x * view.k}
              top={view.y + n.y * view.k}
              k={view.k}
              readOnly={notes.readOnly}
              editing={notes.editing === n.id}
              onEdit={() => notes.onEdit(n.id)}
              onSave={(text) => {
                notes.dispatch({ type: "set-note", id: n.id, text })
                notes.onEdit(null)
              }}
              onCancel={() => {
                // Esc on a note just put down takes it away again.
                if (!n.text) notes.dispatch({ type: "remove-note", id: n.id })
                notes.onEdit(null)
              }}
              onMove={(x, y) =>
                notes.dispatch({ type: "move-note", id: n.id, x, y })
              }
              onRemove={() => notes.dispatch({ type: "remove-note", id: n.id })}
            />
          )
        })}
      {p.graph.edges.some((e) => e.carries?.length) && (
        <Legend
          rows={[
            ["Everything", ALL_COLOR, undefined],
            ["Reads", READS_COLOR, undefined],
            ["Writes and messages", WRITES_COLOR, "7 6"],
            ...(p.traffic?.length
              ? [
                  [
                    p.traffic.map((t) => t.label).join(", "),
                    TYPED_COLOR,
                    "2 5",
                  ] as const,
                ]
              : []),
          ]}
        />
      )}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => fit(size.w, size.h)}
        className="absolute right-3 bottom-3 rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1.5 font-mono text-[11px] text-slate-300 backdrop-blur hover:text-white"
      >
        Recenter
      </button>
    </div>
  )
}

/** The free tile nearest the users: where keyboard placing starts. */
function nearestFree(g: Graph): Pt {
  const u = clientTile(g)
  let best: Pt = u
  let bestD = Infinity
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const d = Math.abs(x - u.x) + Math.abs(y - u.y)
      if (d < bestD && !occupied(g, x, y)) {
        best = { x, y }
        bestD = d
      }
    }
  return best
}

/** The keyboard's tile while placing: solid when free, dashed when taken. */
function TileCursor({ at, taken }: { at: Pt; taken: boolean }) {
  const { sx, sy } = iso(at.x, at.y)
  return (
    <polygon
      transform={`translate(${sx} ${sy})`}
      points={diamond(TW / 2 - 3, TH / 2 - 1.5)}
      fill={taken ? "transparent" : "hsl(188 100% 60% / 0.35)"}
      stroke={taken ? "hsl(352 100% 70%)" : "white"}
      strokeWidth={2.5}
      strokeDasharray={taken ? "6 4" : undefined}
      pointerEvents="none"
    />
  )
}

/** Keyboard focus on a component: drawn, because SVG outlines aren't reliable. */
function FocusRing() {
  return (
    <polygon
      points={diamond(TW / 2 + 2, TH / 2 + 1)}
      fill="none"
      stroke="white"
      strokeWidth={2}
      strokeDasharray="5 3"
      pointerEvents="none"
    />
  )
}

/**
 * Keep the middle of the screen over the grid: some of the board is always
 * in view, and a note can sit up to half a screen beyond its edge.
 */
function clampView(v: View, w: number, h: number): View {
  if (!w || !h) return v
  const a = (w / 2 - v.x) / v.k / (TW / 2)
  const b = (h / 2 - v.y) / v.k / (TH / 2)
  const clamp = (n: number, max: number) =>
    Math.min(max - 0.5, Math.max(-0.5, n))
  const tx = clamp((a + b) / 2, COLS)
  const ty = clamp((b - a) / 2, ROWS)
  const { sx, sy } = iso(tx, ty)
  return { k: v.k, x: w / 2 - sx * v.k, y: h / 2 - sy * v.k }
}

const clampK = (k: number) => Math.min(2.6, Math.max(0.35, k))

function BoardSlab() {
  const tl = iso(0, 0)
  const tr = iso(COLS - 1, 0)
  const br = iso(COLS - 1, ROWS - 1)
  const bl = iso(0, ROWS - 1)
  const top = { x: tl.sx, y: tl.sy - TH / 2 }
  const right = { x: tr.sx + TW / 2, y: tr.sy }
  const bottom = { x: br.sx, y: br.sy + TH / 2 }
  const left = { x: bl.sx - TW / 2, y: bl.sy }
  const d = 14
  return (
    <g>
      <polygon
        points={`${left.x},${left.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + d} ${left.x},${left.y + d}`}
        fill="hsl(222 50% 12%)"
      />
      <polygon
        points={`${right.x},${right.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + d} ${right.x},${right.y + d}`}
        fill="hsl(222 50% 7%)"
      />
      <polygon
        points={`${top.x},${top.y} ${right.x},${right.y} ${bottom.x},${bottom.y} ${left.x},${left.y}`}
        fill="url(#floor)"
        stroke="hsl(188 100% 60% / 0.35)"
        strokeWidth={1.5}
      />
    </g>
  )
}

function Label({
  y,
  text,
  badge,
  stat,
  hot,
}: {
  y: number
  text: string
  badge?: string
  stat?: string
  hot?: boolean
}) {
  return (
    <g pointerEvents="none">
      <text
        y={y}
        textAnchor="middle"
        className="font-mono"
        fontSize={10.5}
        fill="hsl(210 40% 92%)"
        stroke="hsl(222 60% 6%)"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {text}
        {badge && (
          <tspan fill="hsl(188 100% 70%)" dx={4}>
            {badge}
          </tspan>
        )}
      </text>
      {stat && (
        <text
          y={y + 13}
          textAnchor="middle"
          className="font-mono"
          fontSize={10}
          fontWeight={700}
          fill={hot ? "hsl(352 100% 70%)" : "hsl(152 80% 65%)"}
          stroke="hsl(222 60% 6%)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {stat}
        </text>
      )}
    </g>
  )
}

/** What each line colour means. Shown once a connection has a chosen type. */
function Legend({
  rows,
}: {
  rows: readonly (readonly [string, string, string | undefined])[]
}) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 space-y-1 rounded-lg border border-white/10 bg-slate-950/80 px-2.5 py-2 text-[11px] text-slate-300 backdrop-blur">
      {rows.map(([label, color, dash]) => (
        <div key={label} className="flex items-center gap-2">
          <svg width="22" height="6" aria-hidden>
            <line
              x1="1"
              y1="3"
              x2="21"
              y2="3"
              stroke={color}
              strokeWidth="2"
              strokeDasharray={dash}
            />
          </svg>
          {label}
        </div>
      ))}
    </div>
  )
}
