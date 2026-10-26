import { renderToString } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({ state: { status: "signed-out" } as object }))
vi.mock("~/auth/auth", () => ({ useAuth: () => auth.state }))

const signedIn = (uid: string) => ({
  status: "signed-in",
  user: { uid, name: "", email: null, photo: null, provider: "github" },
})

async function load(admins: string) {
  vi.resetModules()
  vi.stubEnv("VITE_ADMIN_UIDS", admins)
  const { ReportButton } = await import("~/ui/ReportButton")
  const report = { id: "est:front-page:1", kind: "Estimation", lines: ["Q?"] }
  return () => renderToString(<ReportButton report={report} />)
}

afterEach(() => vi.unstubAllEnvs())

describe("the report button", () => {
  it("shows only to a signed-in admin", async () => {
    const render = await load("admin-1, admin-2")
    auth.state = { status: "signed-out" }
    expect(render()).toBe("")
    auth.state = signedIn("someone-else")
    expect(render()).toBe("")
    auth.state = signedIn("admin-2")
    expect(render()).toContain("Report")
  })

  it("shows to nobody when no admin is configured", async () => {
    const render = await load("")
    auth.state = signedIn("")
    expect(render()).toBe("")
  })
})

describe("the report link", () => {
  it("opens a new issue labelled for a human, quoting the card", async () => {
    const { reportUrl } = await import("../report")
    const url = new URL(
      reportUrl(
        {
          id: "schema:bad-migration:0",
          kind: "Schema & API",
          lines: ["A?", "✓ B", ""],
        },
        "https://example.test/#/deck/bad-migration/schema",
      ),
    )
    expect(url.pathname).toBe("/TimmDay/tim-game-architech/issues/new")
    expect(url.searchParams.get("labels")).toBe("ready-for-human")
    expect(url.searchParams.get("title")).toContain("schema:bad-migration:0")
    const body = url.searchParams.get("body") ?? ""
    expect(body).toContain("> A?\n>\n> ✓ B")
    expect(body).toContain("#/deck/bad-migration/schema")
  })
})
