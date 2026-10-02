// Production first run (docs/DEPLOY.md): create the business, its owner and the starter
// catalog in an empty database. Used by scripts/setup-prod.ts. No demo customers, jobs or
// money: the demo seed (prisma/seed.ts) refuses to run in production.

import { randomInt } from "node:crypto"
import bcrypt from "bcryptjs"
import type { PrismaClient } from "@/generated/prisma/client"
import { isTimezone } from "./schema"
import { seedCatalog } from "./sample-data"

export type BootstrapInput = {
  businessName: string
  ownerName: string
  ownerEmail: string
  timezone?: string
}

const WORDS = [
  "maple",
  "river",
  "cedar",
  "stone",
  "amber",
  "harbor",
  "willow",
  "summit",
  "copper",
  "meadow",
]

/** "cedar-harbor-meadow-4821": easy to read out, 16+ characters, changed at first sign in. */
export function temporaryPassword() {
  const w = () => WORDS[randomInt(WORDS.length)]
  return `${w()}-${w()}-${w()}-${randomInt(1000, 10000)}`
}

/**
 * Refuses when any business exists, so it can't be run twice or against a used database.
 * Returns the owner's one-time temporary password (they must change it when they sign in).
 */
export async function bootstrapProduction(db: PrismaClient, input: BootstrapInput) {
  const businessName = input.businessName.trim()
  const ownerName = input.ownerName.trim()
  const ownerEmail = input.ownerEmail.trim().toLowerCase()
  const timezone = input.timezone ?? "America/New_York"
  if (!businessName) throw new Error("Give the business a name (--business).")
  if (!ownerName) throw new Error("Give the owner a name (--name).")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail))
    throw new Error("Give the owner a valid email (--email).")
  if (!isTimezone(timezone)) throw new Error(`Unknown timezone: ${timezone}`)
  if ((await db.business.count()) > 0)
    throw new Error("This database already has a business. Nothing was changed.")

  const password = temporaryPassword()
  const passwordHash = await bcrypt.hash(password, 10)
  const result = await db.$transaction(
    async (tx) => {
      const business = await tx.business.create({
        data: { name: businessName, timezone, nextQuoteNumber: 1001 },
      })
      const owner = await tx.user.create({
        data: {
          businessId: business.id,
          name: ownerName,
          email: ownerEmail,
          role: "OWNER",
          avatarColor: "#2D3436",
          passwordHash,
          mustChangePassword: true,
        },
      })
      const items = await seedCatalog(tx, business.id)
      return { businessId: business.id, ownerId: owner.id, catalogItems: items.size }
    },
    { timeout: 60_000 }
  )
  return { ...result, ownerEmail, temporaryPassword: password }
}
