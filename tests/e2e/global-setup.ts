import { execSync } from "node:child_process"
import pg from "pg"
import { E2E_DATABASE_URL } from "./env"

// Fresh database for every run: create it if needed, migrate, seed the demo data.
export default async function globalSetup() {
  const url = new URL(E2E_DATABASE_URL)
  const dbName = url.pathname.slice(1)
  const admin = new URL(E2E_DATABASE_URL)
  admin.pathname = "/postgres"
  admin.search = ""
  const client = new pg.Client({ connectionString: admin.toString() })
  await client.connect()
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName])
  if (!exists.rowCount) await client.query(`CREATE DATABASE "${dbName}"`)
  await client.end()

  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL }
  execSync("pnpm exec prisma migrate deploy", { env, stdio: "pipe" })
  execSync("pnpm exec tsx prisma/seed.ts", { env, stdio: "pipe" })
}
