import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations and scripts use the direct connection when there is one: Neon (via the
    // Vercel integration) sets DATABASE_URL to its pooler and DATABASE_URL_UNPOOLED to the
    // database itself, and migrations can't run through a pooler. The app always uses
    // DATABASE_URL (src/lib/db.ts).
    // `prisma generate` doesn't need a database, so a fresh clone (or `pnpm install` in CI)
    // works without either; migrate/seed fail loudly if both are missing.
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
})
