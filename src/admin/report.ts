import { useAuth } from "~/auth/auth"

/**
 * Admins: Firebase UIDs from VITE_ADMIN_UIDS, comma-separated. A UID isn't a
 * secret and the only admin tool opens a GitHub page the admin must submit
 * themselves, so a check in the browser is enough.
 */
const ADMINS = new Set(
  (import.meta.env.VITE_ADMIN_UIDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
)

export function useIsAdmin(): boolean {
  const auth = useAuth()
  return auth.status === "signed-in" && ADMINS.has(auth.user.uid)
}

const REPO = "https://github.com/TimmDay/tim-game-architech"
/** GitHub refuses very long new-issue links; keep well under. */
const MAX_BODY = 6_000

export type CardReport = {
  /** The card's award key or id, as the code knows it: `est:front-page:1`. */
  id: string
  /** What kind of card, in a word or two: "Estimation". */
  kind: string
  /** The card's text as written, `{kind}` tokens and all, for finding it in the source. */
  lines: string[]
}

/** A prefilled new-issue page, labelled for a human to look at. */
export function reportUrl(r: CardReport, page = location.href): string {
  const quoted = r.lines
    .filter(Boolean)
    .map((l) => `> ${l.replace(/\n/g, "\n> ")}`)
    .join("\n>\n")
  const body = [
    `**Card:** \`${r.id}\` (${r.kind})`,
    `**Seen at:** ${page}`,
    "",
    quoted,
    "",
    "**What's wrong:**",
    "",
  ]
    .join("\n")
    .slice(0, MAX_BODY)
  const q = new URLSearchParams({
    title: `Card report: ${r.kind} ${r.id}`,
    body,
    labels: "ready-for-human",
  })
  return `${REPO}/issues/new?${q}`
}
