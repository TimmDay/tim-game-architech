import { Download, Share, X } from "lucide-react"
import { useState } from "react"
import { loadInstallDismissed, saveInstallDismissed } from "~/game/storage"
import { install, isIos, isStandalone, useCanInstall } from "~/pwa"

/**
 * Offers to install the game where the browser can, and explains how on an
 * iPhone, where it never offers. Hidden once installed or dismissed.
 */
export function InstallCard() {
  const canInstall = useCanInstall()
  const [dismissed, setDismissed] = useState(loadInstallDismissed)
  const ios = isIos()
  if (dismissed || isStandalone() || (!canInstall && !ios)) return null
  const dismiss = () => {
    saveInstallDismissed()
    setDismissed(true)
  }
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-cyan-300/25 bg-cyan-300/5 p-3.5">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-[14px] font-semibold text-white">
          Install Architech
        </div>
        <p className="text-[13px] leading-relaxed text-slate-400">
          {canInstall ? (
            "Full screen, from your home screen, and it works offline."
          ) : (
            <>
              Tap <Share size={13} className="inline align-[-2px]" /> Share,
              then <b className="text-slate-200">Add to Home Screen</b>. It
              opens full screen and works offline.
            </>
          )}
        </p>
        {canInstall && (
          <button
            type="button"
            onClick={() => void install()}
            className="mt-1.5 flex items-center gap-1.5 rounded-full bg-cyan-300 px-3.5 py-1.5 text-[13px] font-semibold text-slate-950"
          >
            <Download size={14} /> Install
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Don't show this again"
        className="rounded-full p-1 text-slate-500 hover:text-slate-200"
      >
        <X size={16} />
      </button>
    </div>
  )
}
