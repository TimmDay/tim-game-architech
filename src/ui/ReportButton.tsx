import clsx from "clsx"
import { Flag } from "lucide-react"
import { reportUrl, useIsAdmin, type CardReport } from "~/admin/report"

/** Admins only: flag this card for a human, as a prefilled GitHub issue. */
export function ReportButton({
  report,
  className,
}: {
  report: CardReport
  className?: string
}) {
  if (!useIsAdmin()) return null
  return (
    <a
      href={reportUrl(report)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="Report this card"
      title="Report this card (admin)"
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-mono text-[10px] text-slate-500 hover:bg-white/5 hover:text-rose-200",
        className,
      )}
    >
      <Flag size={12} /> Report
    </a>
  )
}
