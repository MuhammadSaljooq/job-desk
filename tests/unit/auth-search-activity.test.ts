import { describe, expect, it } from "vitest"
import { safeNextPath } from "@/features/auth/safe-next"
import { activityHref, relativeTime } from "@/features/activity/format"
import { isActive } from "@/components/shell/nav-items"

describe("safeNextPath (no open redirects)", () => {
  it("allows same-site paths", () => {
    expect(safeNextPath("/customers")).toBe("/customers")
    expect(safeNextPath("/quotes/abc?tab=x")).toBe("/quotes/abc?tab=x")
  })
  it("rejects other origins and odd values", () => {
    for (const bad of [
      "//evil.com",
      "https://evil.com",
      "/\\evil.com",
      "evil",
      "",
      null,
      5,
      "/login",
      "/api/auth/x",
      "/a\nb",
    ]) {
      expect(safeNextPath(bad)).toBe("/")
    }
  })
})

describe("activity formatting", () => {
  const now = new Date("2026-09-29T16:00:00Z") // 12:00 in New York, a Tuesday
  const tz = "America/New_York"
  it("shows the time today, a weekday this week, else a date", () => {
    expect(relativeTime(new Date("2026-09-29T13:40:00Z"), now, tz)).toBe("09:40")
    expect(relativeTime(new Date("2026-09-28T15:00:00Z"), now, tz)).toBe("Mon")
    expect(relativeTime(new Date("2026-09-07T15:00:00Z"), now, tz)).toBe("Sep 7")
  })
  it("links each entity to the right page", () => {
    expect(activityHref({ entity: "quote", entityId: "q1", customerId: "c1" })).toBe("/quotes/q1")
    expect(activityHref({ entity: "job", entityId: "j1", customerId: "c1" })).toBe(
      "/customers/c1?job=j1"
    )
    expect(activityHref({ entity: "photo", entityId: "p1", customerId: "c1" })).toBe(
      "/customers/c1/photos"
    )
    expect(activityHref({ entity: "transaction", entityId: "t1", customerId: null })).toBe("/books")
  })
})

describe("nav active state", () => {
  it("matches sections and their children, and Home only exactly", () => {
    expect(isActive("/customers", "/customers/abc/photos")).toBe(true)
    expect(isActive("/customers", "/customersx")).toBe(false)
    expect(isActive("/", "/")).toBe(true)
    expect(isActive("/", "/quotes")).toBe(false)
  })
})
