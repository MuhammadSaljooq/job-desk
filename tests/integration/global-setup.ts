import { execSync } from "node:child_process"
import { TEST_DATABASE_URL } from "./env"

// Bring the test database schema up to date once per run.
export default function setup() {
  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  })
}
