import "server-only"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"

// One PrismaClient per server process. In development, Next's hot reload re-evaluates
// modules, so keep the instance on globalThis to avoid exhausting Postgres connections.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not set")
  // Serverless (Vercel) runs many small instances: keep each one's pool small so they don't
  // exhaust the database's connections. DATABASE_URL should be the pooled URL in production.
  const max = Number(process.env.DB_POOL_MAX) || (process.env.NODE_ENV === "production" ? 5 : 10)
  const adapter = new PrismaPg({ connectionString, max })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
