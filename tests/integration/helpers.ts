import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

/** Wipe every table (business cascades to all business-owned rows). */
export async function resetDb() {
  await db.verificationToken.deleteMany()
  await db.business.deleteMany()
}

/** A business with an owner and two staff, like the seed. */
export async function createBusiness(overrides: { timezone?: string } = {}) {
  const business = await db.business.create({
    data: {
      name: "Test Co",
      timezone: overrides.timezone ?? "America/New_York",
      taxRateBps: 800,
      nextQuoteNumber: 1001,
      quoteFooter: "Thanks",
    },
  })
  const passwordHash = await bcrypt.hash("password123", 4)
  const mk = (name: string, email: string, role: "OWNER" | "STAFF") =>
    db.user.create({ data: { businessId: business.id, name, email, role, passwordHash } })
  const suffix = business.id.slice(-6)
  const owner = await mk("Owner", `owner-${suffix}@test.dev`, "OWNER")
  const jordan = await mk("Jordan Reyes", `jordan-${suffix}@test.dev`, "STAFF")
  const alex = await mk("Alex Lin", `alex-${suffix}@test.dev`, "STAFF")
  return { business, owner, jordan, alex }
}

/** Make requireUser() return this user for the rest of the test (null = signed out). */
export function signInAs(user: { id: string } | null) {
  ;(globalThis as { __testUserId?: string | null }).__testUserId = user?.id ?? null
}
