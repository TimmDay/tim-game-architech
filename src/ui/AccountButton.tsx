import { LogOut, UserRound } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { authConfigured, signIn, signOut, useAuth } from "~/auth/auth"

const GitHubMark = () => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    aria-hidden
    fill="currentColor"
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)
const GoogleMark = () => (
  <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden>
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
    />
  </svg>
)

/** The avatar in every header: sign in, see who you are, sign out. */
export function AccountButton() {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [open])

  const user = auth.status === "signed-in" ? auth.user : null
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
      {open && (
        <div className="pop absolute top-9 right-0 z-[80] w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl shadow-black/60 backdrop-blur">
          {user ? (
            <>
              <p className="text-[14px] font-semibold text-white">
                {user.name}
              </p>
              {user.email && (
                <p className="text-[12px] text-slate-400">{user.email}</p>
              )}
              <p className="mt-2 text-[12px] leading-snug text-slate-500">
                Progress and points are saved to this account on this device.
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
              Sign-in isn't set up on this build yet. You're playing as a guest,
              and progress is saved on this device.
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
        </div>
      )}
    </div>
  )
}
