import { describe, expect, it } from "vitest"
import { claimGuestData, scoped, type KeyValue } from "../profile"

const memory = (
  init: Record<string, string>,
): KeyValue & { data: Record<string, string> } => {
  const data = { ...init }
  return {
    data,
    get length() {
      return Object.keys(data).length
    },
    key: (i) => Object.keys(data)[i] ?? null,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v
    },
  }
}

describe("profiles", () => {
  it("scopes player keys to the account, and leaves device keys alone", () => {
    expect(scoped("lb.progress", "u1")).toBe("lb.u.u1.progress")
    expect(scoped("lb.build.front-page", "u1")).toBe("lb.u.u1.build.front-page")
    expect(scoped("lb.provider", "u1")).toBe("lb.provider")
    expect(scoped("lb.muted", "u1")).toBe("lb.muted")
    expect(scoped("lb.progress", null)).toBe("lb.progress")
  })

  it("carries the guest save into a new account", () => {
    const s = memory({
      "lb.progress": "{}",
      "lb.review": '{"total":40}',
      "lb.provider": '"gcp"',
    })
    expect(claimGuestData(s, "u1")).toBe(2)
    expect(s.data["lb.u.u1.review"]).toBe('{"total":40}')
    expect(s.data["lb.u.u1.provider"]).toBeUndefined()
  })

  it("never overwrites an account that already has data here", () => {
    const s = memory({
      "lb.review": '{"total":5}',
      "lb.u.u1.review": '{"total":900}',
    })
    expect(claimGuestData(s, "u1")).toBe(0)
    expect(s.data["lb.u.u1.review"]).toBe('{"total":900}')
  })
})
