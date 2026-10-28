import { X } from "lucide-react"
import { useEffect, useRef } from "react"
import { NOTE_MAX } from "~/game/edit"
import type { Note } from "~/sim/types"

const DRAG_SLOP = 4

/**
 * One of the player's notes, drawn over the board in screen space so its
 * text stays readable at any zoom. Mouse only to move; Tab, Enter and D
 * reach it from the keyboard.
 */
export function NoteCard({
  note,
  left,
  top,
  k,
  readOnly,
  editing,
  onEdit,
  onSave,
  onCancel,
  onMove,
  onRemove,
}: {
  note: Note
  /** Screen position of the note's corner. */
  left: number
  top: number
  /** Board zoom, to turn a drag in pixels into board space. */
  k: number
  readOnly: boolean
  editing: boolean
  onEdit: () => void
  onSave: (text: string) => void
  onCancel: () => void
  onMove: (x: number, y: number) => void
  onRemove: () => void
}) {
  const card = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  // After Enter or Esc, the keyboard goes back to the card.
  const refocus = useRef(false)
  useEffect(() => {
    if (!editing && refocus.current) {
      refocus.current = false
      card.current?.focus()
    }
  }, [editing])

  const onPointerDown = (e: React.PointerEvent) => {
    // The board pans on a drag; a note owns its own.
    e.stopPropagation()
    if (readOnly || editing || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < DRAG_SLOP) return
    d.moved = true
    d.x = e.clientX
    d.y = e.clientY
    onMove(note.x + dx / k, note.y + dy / k)
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) onEdit()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return
    const key = e.key.toLowerCase()
    if (key === "enter") {
      e.preventDefault()
      onEdit()
    } else if (key === "d" || key === "delete" || key === "backspace") {
      // Before the board's own D, which would delete the selected block.
      e.preventDefault()
      e.stopPropagation()
      onRemove()
    }
  }

  return (
    <div
      className="group absolute z-10"
      style={{ left, top }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
    >
      {editing ? (
        <Editor
          initial={note.text}
          onDone={(text, how) => {
            refocus.current = how !== "blur"
            if (how === "cancel") onCancel()
            else onSave(text)
          }}
        />
      ) : (
        <div
          ref={card}
          tabIndex={0}
          role={readOnly ? "note" : "button"}
          aria-label={`Note: ${note.text}`}
          onKeyDown={onKeyDown}
          className={
            "max-w-[22ch] rounded-lg border border-amber-200/50 bg-slate-950/95 px-2 py-1.5 text-[12px] leading-snug break-words whitespace-pre-wrap text-slate-50 shadow-lg shadow-black/40 outline-none focus-visible:ring-2 focus-visible:ring-white " +
            (readOnly ? "" : "cursor-grab active:cursor-grabbing")
          }
        >
          {note.text}
        </div>
      )}
      {!readOnly && !editing && (
        <button
          type="button"
          aria-label="Delete note"
          tabIndex={-1}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="absolute -top-2 -right-2 hidden size-5 place-items-center rounded-full border border-white/20 bg-slate-800 text-slate-200 group-focus-within:grid group-hover:grid hover:bg-rose-500 hover:text-white"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

/** The note being typed. Enter saves, Shift+Enter breaks the line, Esc cancels. */
function Editor({
  initial,
  onDone,
}: {
  initial: string
  onDone: (text: string, how: "enter" | "cancel" | "blur") => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const done = useRef(false)
  const finish = (how: "enter" | "cancel" | "blur", text?: string) => {
    if (done.current) return
    done.current = true
    onDone(text ?? ref.current?.value ?? "", how)
  }
  useEffect(() => {
    const el = ref.current
    el?.focus({ preventScroll: true })
    el?.setSelectionRange(el.value.length, el.value.length)
  }, [])
  // Leaving without Enter or Esc (a test starting, the page changing) keeps
  // what was typed. Only a real unmount: by then the textarea is out of the
  // page, which isn't so for the dev-mode rehearsal of one.
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  })
  useEffect(() => {
    const el = ref.current
    return () => {
      if (el && !el.isConnected) finishRef.current("blur", el.value)
    }
  }, [])

  return (
    <textarea
      ref={ref}
      defaultValue={initial}
      maxLength={NOTE_MAX}
      aria-label="Note"
      placeholder="Write a note"
      rows={1}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          finish("enter")
        } else if (e.key === "Escape") {
          e.preventDefault()
          finish("cancel")
        }
      }}
      onBlur={() => finish("blur")}
      style={{ fieldSizing: "content" } as React.CSSProperties}
      className="block min-h-8 w-[22ch] resize-none rounded-lg border border-white bg-slate-950 px-2 py-1.5 text-[12px] leading-snug text-slate-50 outline-none placeholder:text-slate-400"
    />
  )
}
