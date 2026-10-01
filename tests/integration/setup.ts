import { vi } from "vitest"
import { TEST_DATABASE_URL } from "./env"

// Server modules read DATABASE_URL; point them at the test database.
process.env.DATABASE_URL = TEST_DATABASE_URL

// "server-only" throws outside a React Server environment; it's a no-op for tests.
vi.mock("server-only", () => ({}))

// Auth.js needs the Next runtime. Tests set the signed-in user with signInAs() instead;
// requireUser() still loads that user from the database exactly as in the app.
vi.mock("@/auth", () => ({
  auth: async () => {
    const id = (globalThis as { __testUserId?: string | null }).__testUserId
    return id ? { user: { id }, expires: "2099-01-01T00:00:00.000Z" } : null
  },
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}))

// Cache revalidation is a no-op outside Next.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
}))
