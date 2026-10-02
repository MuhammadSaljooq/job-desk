import { beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import { verifyCredentials } from "@/features/auth/credentials"
import { bootstrapProduction, temporaryPassword } from "@/features/settings/bootstrap"
import { resetDb } from "./helpers"

beforeEach(resetDb)

const input = {
  businessName: "Dylan's Home Services",
  ownerName: "Dylan",
  ownerEmail: " Dylan@Example.com ",
}

describe("setup:prod (production first run)", () => {
  it("creates the business, an owner who must change the password, and the catalog only", async () => {
    const res = await bootstrapProduction(db, input)
    expect(res.catalogItems).toBe(44)
    expect(res.ownerEmail).toBe("dylan@example.com")
    const owner = await db.user.findUniqueOrThrow({ where: { id: res.ownerId } })
    expect(owner).toMatchObject({ role: "OWNER", mustChangePassword: true, name: "Dylan" })
    expect(
      await verifyCredentials({ email: "dylan@example.com", password: res.temporaryPassword })
    ).toEqual({ id: res.ownerId })
    const business = await db.business.findUniqueOrThrow({ where: { id: res.businessId } })
    expect(business).toMatchObject({ timezone: "America/New_York", nextQuoteNumber: 1001 })
    // no demo data in production
    for (const n of [
      await db.customer.count(),
      await db.job.count(),
      await db.quote.count(),
      await db.transaction.count(),
    ])
      expect(n).toBe(0)
  })

  it("refuses to run twice or with bad input, changing nothing", async () => {
    await expect(bootstrapProduction(db, { ...input, ownerEmail: "nope" })).rejects.toThrow(/email/)
    await expect(bootstrapProduction(db, { ...input, timezone: "Mars/Base" })).rejects.toThrow(
      /timezone/
    )
    expect(await db.business.count()).toBe(0)
    await bootstrapProduction(db, input)
    await expect(bootstrapProduction(db, { ...input, ownerEmail: "x@y.z" })).rejects.toThrow(
      /already has a business/
    )
    expect(await db.business.count()).toBe(1)
    expect(await db.user.count()).toBe(1)
  })

  it("makes long, unpredictable temporary passwords", () => {
    const all = new Set(Array.from({ length: 50 }, temporaryPassword))
    expect(all.size).toBeGreaterThan(45)
    for (const p of all) expect(p).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d{4}$/)
  })
})
