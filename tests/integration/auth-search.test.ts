import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import { verifyCredentials } from "@/features/auth/credentials"
import { parseQuoteNumber, searchEverything } from "@/features/search/search"
import { latestActivity } from "@/features/activity/queries"
import { assertOwner } from "@/lib/auth"
import { createBusiness, resetDb } from "./helpers"

describe("credentials", () => {
  beforeEach(resetDb)
  afterAll(async () => {
    await resetDb()
    await db.$disconnect()
  })

  it("accepts the right password, case-insensitive email", async () => {
    const { owner } = await createBusiness()
    expect(await verifyCredentials({ email: owner.email, password: "password123" })).toEqual({
      id: owner.id,
    })
    expect(
      await verifyCredentials({ email: owner.email.toUpperCase(), password: "password123" })
    ).toEqual({
      id: owner.id,
    })
  })
  it("rejects a wrong password, an unknown email and bad input", async () => {
    const { owner } = await createBusiness()
    expect(await verifyCredentials({ email: owner.email, password: "nope" })).toBeNull()
    expect(
      await verifyCredentials({ email: "nobody@test.dev", password: "password123" })
    ).toBeNull()
    expect(await verifyCredentials({ email: "not-an-email", password: "x" })).toBeNull()
    expect(await verifyCredentials(null)).toBeNull()
  })
  it("rejects accounts without a password", async () => {
    const { business } = await createBusiness()
    const u = await db.user.create({
      data: { businessId: business.id, name: "No Pw", email: "nopw@test.dev" },
    })
    expect(await verifyCredentials({ email: u.email, password: "anything" })).toBeNull()
  })
  it("only owners pass assertOwner", () => {
    expect(() => assertOwner({ role: "OWNER" })).not.toThrow()
    expect(() => assertOwner({ role: "STAFF" })).toThrow(/Only the owner/)
  })
})

describe("global search", () => {
  beforeEach(resetDb)

  async function twoBusinesses() {
    const a = await createBusiness()
    const b = await createBusiness()
    const sarah = await db.customer.create({
      data: {
        businessId: a.business.id,
        name: "Sarah Mitchell",
        phone: "(555) 214-8890",
        address: "142 Maple Ave",
      },
    })
    await db.customer.create({
      data: { businessId: b.business.id, name: "Sarah Other", phone: "(555) 214-8890" },
    })
    await db.job.create({
      data: { businessId: a.business.id, customerId: sarah.id, title: "Hallway drywall" },
    })
    await db.quote.create({
      data: {
        businessId: a.business.id,
        customerId: sarah.id,
        number: 1004,
        title: "Bedroom TV",
        date: new Date("2026-09-24T00:00:00Z"),
        taxRateBps: 800,
      },
    })
    return { a, b, sarah }
  }

  it("finds customers by name, phone digits and address within one business only", async () => {
    const { a } = await twoBusinesses()
    const byName = await searchEverything(a.business.id, "sarah")
    expect(byName.filter((h) => h.kind === "customer").map((h) => h.title)).toEqual([
      "Sarah Mitchell",
    ])
    const byPhone = await searchEverything(a.business.id, "5552148890")
    expect(byPhone.some((h) => h.title === "Sarah Mitchell")).toBe(true)
    expect(byPhone.some((h) => h.title === "Sarah Other")).toBe(false)
    const byAddress = await searchEverything(a.business.id, "maple")
    expect(byAddress[0]?.title).toBe("Sarah Mitchell")
  })
  it("finds jobs and quotes by number in any format", async () => {
    const { a } = await twoBusinesses()
    for (const q of ["1004", "Q-1004", "q1004", "#1004"]) {
      const hits = await searchEverything(a.business.id, q)
      expect(hits.some((h) => h.kind === "quote" && h.title.startsWith("Q-1004"))).toBe(true)
    }
    const jobs = await searchEverything(a.business.id, "drywall")
    expect(jobs.some((h) => h.kind === "job" && h.title === "Hallway drywall")).toBe(true)
  })
  it("ignores one-letter queries", async () => {
    const { a } = await twoBusinesses()
    expect(await searchEverything(a.business.id, "s")).toEqual([])
  })
  it("parses quote numbers", () => {
    expect(parseQuoteNumber("Q-1004")).toBe(1004)
    expect(parseQuoteNumber("sarah")).toBeNull()
  })
})

describe("latest activity", () => {
  beforeEach(resetDb)

  it("counts unread and highlights only the newest unread item", async () => {
    const { business, owner } = await createBusiness()
    const c = await db.customer.create({ data: { businessId: business.id, name: "David Chen" } })
    const mk = (msg: string, at: string, read: boolean) =>
      db.activity.create({
        data: {
          businessId: business.id,
          type: "NOTE",
          message: msg,
          customerId: c.id,
          actorId: owner.id,
          entity: "customer",
          entityId: c.id,
          createdAt: new Date(at),
          readAt: read ? new Date(at) : null,
        },
      })
    await mk("old read", "2026-09-20T10:00:00Z", true)
    await mk("older unread", "2026-09-28T10:00:00Z", false)
    await mk("newest unread", "2026-09-29T10:00:00Z", false)
    const { items, unread } = await latestActivity(business.id, {
      timezone: "UTC",
      now: new Date("2026-09-29T12:00:00Z"),
    })
    expect(unread).toBe(2)
    expect(items.map((i) => i.title)).toEqual(["newest unread", "older unread", "old read"])
    expect(items.filter((i) => i.highlighted).map((i) => i.title)).toEqual(["newest unread"])
    expect(items[0].avatarName).toBe("David Chen") // dashboard mode: the customer
    const actorMode = await latestActivity(business.id, { timezone: "UTC", avatar: "actor" })
    expect(actorMode.items[0].avatarName).toBe("Me") // the owner did it
  })
})
