import { Volume2, VolumeX } from "lucide-react"
import { setMuted, useMuted } from "~/game/sound"

export function MuteButton() {
  const muted = useMuted()
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      title={muted ? "Sound off" : "Sound on"}
      className="grid size-7 place-items-center rounded-full border border-white/10 text-slate-400 hover:text-white"
    >
      {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
    </button>
  )
}
