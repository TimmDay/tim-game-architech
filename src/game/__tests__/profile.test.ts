import { describe, expect, it } from "vitest"
import { GUEST, scoped } from "../profile"

describe("profiles", () => {
  it("scopes player keys to the account, and leaves device keys alone", () => {
    expect(scoped("lb.progress", "u1")).toBe("lb.u.u1.progress")
    expect(scoped("lb.build.front-page", "u1")).toBe("lb.u.u1.build.front-page")
    expect(scoped("lb.provider", "u1")).toBe("lb.provider")
    expect(scoped("lb.muted", "u1")).toBe("lb.muted")
    expect(scoped("lb.progress", null)).toBe("lb.progress")
    expect(scoped("lb.progress", GUEST)).toBe("lb.progress")
  })
})
