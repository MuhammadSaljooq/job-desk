import { afterEach, describe, expect, it, vi } from "vitest"
import { appUrl, redirectUri } from "@/lib/storage/oauth"

vi.mock("server-only", () => ({}))

afterEach(() => vi.unstubAllEnvs())

describe("appUrl (OAuth redirects)", () => {
  it("uses APP_URL first, without a trailing slash", () => {
    vi.stubEnv("APP_URL", "https://jobdesk.example.com/")
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "job-desk-dylan.vercel.app")
    expect(appUrl()).toBe("https://jobdesk.example.com")
    expect(redirectUri("google")).toBe("https://jobdesk.example.com/api/storage/callback/google")
  })

  it("falls back to the Vercel production domain, then localhost", () => {
    vi.stubEnv("APP_URL", "")
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "job-desk-dylan.vercel.app")
    expect(appUrl()).toBe("https://job-desk-dylan.vercel.app")
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "")
    expect(appUrl()).toBe("http://localhost:3210")
  })
})
