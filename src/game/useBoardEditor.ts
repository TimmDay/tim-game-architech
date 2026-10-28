import { useEffect, useReducer, useRef, useState } from "react"
import type { Provider } from "~/providers/names"
import type { ComponentKind, Graph } from "~/sim/types"
import { CLIENT_ID } from "~/sim/types"
import { plain } from "~/text"
import {
  canConnect,
  edit,
  inBounds,
  nextNoteId,
  occupied,
  type Action,
} from "./edit"
import { sfx } from "./sound"

export type Tool =
  | { t: "select" }
  | { t: "place"; kind: ComponentKind }
  /** `building`: started from a + handle, so finishing it doesn't open the inspector. */
  | { t: "connect"; from: string; building?: boolean }
  | { t: "diagnose" }
  /** Click (or Enter for the top left) to put a note there. */
  | { t: "note" }

export type Selection = { node?: string; edge?: string }

export const nameOf = (graph: Graph, id: string, provider: Provider) => {
  if (id === CLIENT_ID) return "Users"
  const c = graph.components.find((c) => c.id === id)
  return c ? plain(`{${c.kind}}`, provider) : id
}

/**
 * Everything about editing a board: the graph, the active tool, the
 * selection, tap handling, keyboard shortcuts, and the sounds that go with
 * each. Shared by Play and Survival so the two can't drift apart.
 */
export function useBoardEditor({
  initial,
  provider,
  running,
  onInspect,
  onPlaced,
  onToast,
  onDiagnose,
  notes = false,
}: {
  initial: Graph
  provider: Provider
  /** While a test runs, the board is look-but-don't-touch. */
  running: boolean
  /** Called when a selection should bring up the inspector (phones). */
  onInspect?: () => void
  /** Called after a component is placed: back to the palette, for the next one. */
  onPlaced?: () => void
  onToast?: (msg: string) => void
  /** Repair mode: a tap while diagnosing. */
  onDiagnose?: (id: string) => void
  /** Notes can be written here (desktop Play, not Survival). */
  notes?: boolean
}) {
  const [graph, rawDispatch] = useReducer(edit, initial)
  const [tool, setTool] = useState<Tool>({ t: "select" })
  const [sel, setSel] = useState<Selection>({})
  /** The note open for typing, if any. */
  const [editingNote, setEditingNote] = useState<string | null>(null)

  /** Edit the graph, with the sound for what happened. */
  const dispatch = (a: Action) => {
    if (a.type === "place") sfx.place()
    else if (a.type === "connect") sfx.connect()
    else if (a.type === "remove" || a.type === "remove-edge") sfx.remove()
    else if (a.type === "set") sfx.click()
    rawDispatch(a)
  }
  const dispatchRef = useRef(dispatch)
  useEffect(() => {
    dispatchRef.current = dispatch
  })

  // Keyboard, desktop: C connects from the selected block, D (or Delete)
  // removes the selected block or connection, T starts a note, Esc cancels.
  // Subscribed once, reading current state through a ref.
  const keyState = useRef({ sel, running, notes })
  useEffect(() => {
    keyState.current = { sel, running, notes }
  }, [sel, running, notes])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t?.closest("input, textarea, select, [contenteditable]")) return
      // A popup owns the keyboard: D must never delete something behind it.
      if (document.querySelector('[role="dialog"]')) return
      const { sel, running, notes } = keyState.current
      if (e.key === "Escape") {
        setTool((cur) => (cur.t === "select" ? cur : { t: "select" }))
        return
      }
      if (running) return
      const key = e.key.toLowerCase()
      if (key === "t" && notes) {
        e.preventDefault()
        setTool((cur) => (cur.t === "note" ? { t: "select" } : { t: "note" }))
      } else if (key === "c" && sel.node) {
        e.preventDefault()
        const from = sel.node
        setTool((cur) =>
          cur.t === "connect" ? { t: "select" } : { t: "connect", from },
        )
      } else if (key === "d" || key === "delete" || key === "backspace") {
        if (sel.edge) dispatchRef.current({ type: "remove-edge", id: sel.edge })
        else if (sel.node && sel.node !== CLIENT_ID)
          dispatchRef.current({ type: "remove", id: sel.node })
        else return
        e.preventDefault()
        setSel({})
        setTool({ t: "select" })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  /** Start a connection from this component, or cancel one already started. */
  const startConnect = (id: string) => {
    if (running) return
    setSel({})
    setTool(
      tool.t === "connect" && tool.from === id
        ? { t: "select" }
        : { t: "connect", from: id, building: true },
    )
  }

  /**
   * Finish the connection being drawn at this component. A connection begun
   * from the inspector selects the target and goes back to it; one begun from
   * a + handle leaves the player building, however it's finished.
   */
  const finishConnect = (id: string) => {
    if (tool.t !== "connect") return
    const inspect = !tool.building
    if (canConnect(graph, tool.from, id)) {
      dispatch({ type: "connect", from: tool.from, to: id })
      if (inspect) setSel({ node: id })
    } else if (id !== tool.from) {
      onToast?.(
        "Those two are already connected, or that isn't a valid target.",
      )
    }
    setTool({ t: "select" })
    if (inspect) onInspect?.()
  }

  /** The = handle: connect, and stay ready to build. */
  const receive = (id: string) => {
    if (!running) finishConnect(id)
  }

  const onTapNode = (id: string) => {
    if (running) return
    if (tool.t === "connect") return finishConnect(id)
    if (tool.t === "diagnose") {
      setTool({ t: "select" })
      if (id !== CLIENT_ID) onDiagnose?.(id)
      return
    }
    setSel({ node: id })
    onInspect?.()
  }

  /** Put a new note at this board point and open it for typing. */
  const placeNote = (x: number, y: number) => {
    if (running) return
    const id = nextNoteId(graph)
    rawDispatch({ type: "add-note", id, x, y })
    sfx.place()
    setEditingNote(id)
    setSel({})
    setTool({ t: "select" })
  }

  const onTapTile = (x: number, y: number) => {
    if (running) return
    if (tool.t === "place") {
      if (!inBounds(x, y) || occupied(graph, x, y)) return
      // Placing isn't inspecting: stay ready to add the next component, and
      // inspect only on an explicit tap.
      dispatch({ type: "place", kind: tool.kind, x, y })
      setSel({})
      setTool({ t: "select" })
      onPlaced?.()
      return
    }
    if (tool.t !== "select") setTool({ t: "select" })
    setSel({})
  }

  const onTapEdge = (id: string) => {
    if (running) return
    setSel({ edge: id })
    setTool({ t: "select" })
    onInspect?.()
  }

  const onMove = (id: string, x: number, y: number) => {
    if (!running) rawDispatch({ type: "move", id, x, y })
  }

  const banner =
    tool.t === "place"
      ? `Tap an empty tile to place ${plain(`{${tool.kind}}`, provider)}`
      : tool.t === "connect"
        ? `Tap where requests from ${nameOf(graph, tool.from, provider)} should go`
        : tool.t === "diagnose"
          ? "Tap the component that is the root cause"
          : tool.t === "note"
            ? "Click where the note goes, or press Enter for the top left"
            : null

  return {
    startConnect,
    receive,
    graph,
    dispatch,
    tool,
    setTool,
    sel,
    setSel,
    onTapNode,
    onTapTile,
    onTapEdge,
    onMove,
    banner,
    placeNote,
    editingNote,
    setEditingNote,
  }
}
