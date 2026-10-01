import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

const alias = { "@": path.resolve(import.meta.dirname, "src") }

// Two projects:
//  - unit: pure logic and components (no database)
//  - integration: server code against a real Postgres (TEST_DATABASE_URL, default jobdesk_test)
export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/unit/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          // one database: run files one after another
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
