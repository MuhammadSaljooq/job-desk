import { vi } from "vitest"
import { TEST_DATABASE_URL } from "./env"

// Server modules read DATABASE_URL; point them at the test database.
process.env.DATABASE_URL = TEST_DATABASE_URL
// "server-only" throws outside a React Server environment; it's a no-op for tests.
vi.mock("server-only", () => ({}))
