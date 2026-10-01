import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` doesn't need a database, so a fresh clone (or `pnpm install` in CI)
    // works without DATABASE_URL; migrate/seed fail loudly if it is missing.
    url: process.env.DATABASE_URL ?? "",
  },
})
