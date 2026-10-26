import { LogOut, UserRound } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { authConfigured, signIn, signOut, useAuth } from "~/auth/auth"
import { useSyncStatus } from "~/sync/cloud"
import { GitHubMark, GoogleMark } from "./brand-marks"

/** The avatar in every header: sign in, see who you are, sign out. */
export function AccountButton() {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  // Where the popover hangs: under the button, right edges aligned.
  const [at, setAt] = useState({ top: 0, right: 0 })

  // Before paint, so the popover never shows a frame in the wrong place.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = ref.current?.getBoundingClientRect()
      if (r) setAt({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    place()
    const close = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !pop.current?.contains(t)) setOpen(false)
    }
    window.addEventListener("pointerdown", close)
    window.addEventListener("resize", place)
    return () => {
      window.removeEventListener("pointerdown", close)
      window.removeEventListener("resize", place)
    }
  }, [open])

  const user = auth.status === "signed-in" ? auth.user : null
  const sync = useSyncStatus()
  const syncLabel = {
    off: "Not syncing",
    syncing: "Syncing…",
    synced: "Saved to the cloud",
    offline: "Offline: will sync when you're back",
    error: "Couldn't save: retrying",
  }[sync]
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={user ? `Account: ${user.name}` : "Sign in"}
        className="grid size-7 place-items-center overflow-hidden rounded-full border border-white/10 text-slate-400 hover:text-white"
      >
        {user?.photo ? (
          <img
            src={user.photo}
            alt=""
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <UserRound size={14} />
        )}
      </button>
      {open &&
        // On the body, not in the header: the header's blur makes its own
        // stacking context, which the board can paint over.
        createPortal(
          <div
            ref={pop}
            style={{ top: at.top, right: at.right }}
            className="pop fixed z-[80] w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl shadow-black/60 backdrop-blur"
          >
            {user ? (
              <>
                <p className="text-[14px] font-semibold text-white">
                  {user.name}
                </p>
                {user.email && (
                  <p className="text-[12px] text-slate-400">{user.email}</p>
                )}
                <p
                  className={
                    "mt-2 text-[12px] leading-snug " +
                    (sync === "synced"
                      ? "text-emerald-300"
                      : sync === "error"
                        ? "text-rose-300"
                        : "text-slate-400")
                  }
                >
                  {syncLabel}. Progress follows you to any device you sign in
                  on.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    void signOut()
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-[13px] text-slate-200 hover:border-white/25"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </>
            ) : !authConfigured ? (
              <p className="text-[13px] leading-snug text-slate-400">
                Sign-in isn't set up on this build yet. You're playing as a
                guest, and progress is saved on this device.
              </p>
            ) : (
              <>
                <p className="text-[14px] font-semibold text-white">Sign in</p>
                <p className="mt-0.5 text-[12px] leading-snug text-slate-400">
                  Keep your points and progress under your own account. Anything
                  you earned as a guest comes with you.
                </p>
                {auth.status === "signed-out" && auth.error && (
                  <p className="mt-2 text-[12px] text-rose-300">{auth.error}</p>
                )}
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => void signIn("github")}
                    disabled={auth.status === "loading"}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2 text-[13px] font-semibold text-slate-950 disabled:opacity-50"
                  >
                    <GitHubMark /> Continue with GitHub
                  </button>
                  <button
                    type="button"
                    onClick={() => void signIn("google")}
                    disabled={auth.status === "loading"}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-slate-800 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                  >
                    <GoogleMark /> Continue with Google
                  </button>
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
