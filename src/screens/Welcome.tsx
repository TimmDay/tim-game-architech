import { Cloud, HardDrive } from "lucide-react"
import { continueAsGuest, signIn, type AuthState } from "~/auth/auth"
import { GitHubMark, GoogleMark } from "~/ui/brand-marks"

/**
 * First thing a signed-out player sees, when sign-in is configured: an
 * account to keep progress across devices, or a guest session that lasts as
 * long as the tab.
 */
export function Welcome({ auth }: { auth: AuthState }) {
  const busy = auth.status === "loading"
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-6 py-10">
      <div className="w-full">
        <p className="font-mono text-[11px] tracking-[0.25em] text-cyan-300/80 uppercase">
          A system design game
        </p>
        <h1 className="font-display mt-2 text-6xl leading-[0.95] font-bold tracking-tight text-white">
          Archi
          <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400 bg-clip-text text-transparent">
            tech
          </span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
          Build architectures, throw traffic at them, survive the chaos.
        </p>

        <div className="mt-8 space-y-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void signIn("github")}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white py-3 text-[15px] font-semibold text-slate-950 disabled:opacity-50"
          >
            <GitHubMark /> Continue with GitHub
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void signIn("google")}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-slate-800 py-3 text-[15px] font-semibold text-white disabled:opacity-50"
          >
            <GoogleMark /> Continue with Google
          </button>
          <p className="flex items-center justify-center gap-1.5 pt-1 text-[12px] text-slate-400">
            <Cloud size={13} /> Your points and progress follow you to every
            device.
          </p>
        </div>

        <div className="my-6 flex items-center gap-3 text-[11px] text-slate-600 uppercase">
          <span className="h-px flex-1 bg-white/10" /> or{" "}
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={continueAsGuest}
          className="w-full rounded-xl border border-white/10 py-3 text-[15px] text-slate-200 hover:border-white/25 disabled:opacity-50"
        >
          Continue as guest
        </button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-slate-500">
          <HardDrive size={13} /> Guest progress stays in this browser. Sign in
          any time to take it to other devices.
        </p>

        {auth.status === "signed-out" && auth.error && (
          <p className="mt-4 text-center text-[13px] text-rose-300">
            {auth.error}
          </p>
        )}
      </div>
    </main>
  )
}
