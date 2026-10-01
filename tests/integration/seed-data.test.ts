import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import { clearSampleRecords, seedSampleRecords } from "@/features/settings/sample-data"
import { createBusiness, resetDb } from "./helpers"

async function setup() {
  const { business, owner, jordan, alex } = await createBusiness()
  await seedSampleRecords(db, {
    businessId: business.id,
    timezone: business.timezone,
    today: "2026-09-29",
    team: { ownerId: owner.id, jordanId: jordan.id, alexId: alex.id },
  })
  return business
}

describe("sample data", () => {
  beforeEach(resetDb)
  afterAll(async () => {
    await resetDb()
    await db.$disconnect()
  })

  it("creates the catalog with no prices and every stage", async () => {
    const business = await setup()
    expect(await db.catalogCategory.count({ where: { businessId: business.id } })).toBe(9)
    expect(await db.catalogItem.count({ where: { businessId: business.id } })).toBe(44)
    const stages = await db.job.groupBy({
      by: ["stage"],
      where: { businessId: business.id },
      _count: true,
    })
    expect(stages.map((s) => s.stage).sort()).toEqual(
      ["COMPLETED", "IN_PROGRESS", "LEAD", "QUOTED", "SCHEDULED"].sort()
    )
  })

  it("schedules jobs at local wall-clock time", async () => {
    const business = await setup()
    const hallway = await db.job.findFirstOrThrow({
      where: { businessId: business.id, title: "Hallway drywall and paint" },
    })
    // today + 3 days at 09:00 New York (EDT) = 13:00 UTC
    expect(hallway.scheduledAt?.toISOString()).toBe("2026-10-02T13:00:00.000Z")
  })

  it("links deposits and payments to their quotes", async () => {
    const business = await setup()
    const linked = await db.transaction.groupBy({
      by: ["quoteId"],
      where: { businessId: business.id, type: "INCOME", quoteId: { not: null } },
      _sum: { amountCents: true },
    })
    const byNumber = new Map<number, number>()
    for (const row of linked) {
      const q = await db.quote.findUniqueOrThrow({ where: { id: row.quoteId! } })
      byNumber.set(q.number, row._sum.amountCents ?? 0)
    }
    expect(byNumber.get(1001)).toBe(33804)
    expect(byNumber.get(1002)).toBe(50000)
    expect(byNumber.get(1004)).toBe(10000)
  })

  it("keeps empty prices empty (D6)", async () => {
    const business = await setup()
    const q1005 = await db.quote.findFirstOrThrow({
      where: { businessId: business.id, number: 1005 },
      include: { lines: true },
    })
    expect(q1005.lines.every((l) => l.unitPriceCents === null)).toBe(true)
  })

  it("clears sample records but keeps the team and catalog", async () => {
    const business = await setup()
    await clearSampleRecords(db, business.id)
    expect(await db.customer.count({ where: { businessId: business.id } })).toBe(0)
    expect(await db.quote.count({ where: { businessId: business.id } })).toBe(0)
    expect(await db.transaction.count({ where: { businessId: business.id } })).toBe(0)
    expect(await db.activity.count({ where: { businessId: business.id } })).toBe(0)
    expect(await db.user.count({ where: { businessId: business.id } })).toBe(3)
    expect(await db.catalogItem.count({ where: { businessId: business.id } })).toBe(44)
  })
})
