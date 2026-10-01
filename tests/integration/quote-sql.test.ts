import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import { customerBalances, quoteTotalsFor } from "@/features/quotes/sql"
import { quoteTotals } from "@/features/quotes/totals"
import { seedSampleRecords } from "@/features/settings/sample-data"
import { createBusiness, resetDb } from "./helpers"

describe("quote totals in SQL", () => {
  beforeEach(resetDb)
  afterAll(async () => {
    await resetDb()
    await db.$disconnect()
  })

  async function seeded() {
    const { business, owner, jordan, alex } = await createBusiness()
    await seedSampleRecords(db, {
      businessId: business.id,
      timezone: business.timezone,
      today: "2026-09-29",
      team: { ownerId: owner.id, jordanId: jordan.id, alexId: alex.id },
    })
    return business
  }

  it("agrees with totals.ts for every seeded quote", async () => {
    const business = await seeded()
    const rows = await quoteTotalsFor(business.id)
    expect(rows).toHaveLength(6)
    for (const row of rows) {
      const q = await db.quote.findUniqueOrThrow({
        where: { id: row.id },
        include: { lines: true },
      })
      const js = quoteTotals(
        q.lines.map((l) => ({ qty: l.qty.toString(), unitPriceCents: l.unitPriceCents })),
        { taxRateBps: q.taxRateBps, discountCents: q.discountCents }
      )
      expect({ n: row.number, total: row.total, tax: row.tax, sub: row.subtotal }).toEqual({
        n: q.number,
        total: js.total,
        tax: js.tax,
        sub: js.subtotal,
      })
    }
    const byNumber = Object.fromEntries(rows.map((r) => [r.number, r.total]))
    expect(byNumber).toMatchObject({
      1001: 33804,
      1002: 120636,
      1003: 48060,
      1004: 23544,
      1005: 0,
      1006: 35640,
    })
  })

  it("agrees on fractional quantities, discounts and half-cent rounding", async () => {
    const { business } = await createBusiness()
    const c = await db.customer.create({ data: { businessId: business.id, name: "X" } })
    const lines = [
      { qty: 1.5, unitPriceCents: 8505 },
      { qty: 2.25, unitPriceCents: 3333 },
      { qty: 1, unitPriceCents: null },
    ]
    const q = await db.quote.create({
      data: {
        businessId: business.id,
        customerId: c.id,
        number: 1,
        date: new Date("2026-09-29T00:00:00Z"),
        taxRateBps: 825,
        discountCents: 1999,
        lines: {
          create: lines.map((l, i) => ({
            businessId: business.id,
            name: `L${i}`,
            sortOrder: i,
            ...l,
          })),
        },
      },
    })
    const [row] = await quoteTotalsFor(business.id, { quoteIds: [q.id] })
    const js = quoteTotals(lines, { taxRateBps: 825, discountCents: 1999 })
    expect(row.total).toBe(js.total)
    expect(row.tax).toBe(js.tax)
  })

  it("computes customer balances (seed: unpaid $841.80)", async () => {
    const business = await seeded()
    const balances = await customerBalances(business.id)
    const total = [...balances.values()].reduce((a, b) => a + b.balance, 0)
    expect(total).toBe(84180)
    const sarah = await db.customer.findFirstOrThrow({
      where: { businessId: business.id, name: "Sarah Mitchell" },
    })
    expect(balances.get(sarah.id)).toEqual({ accepted: 33804, paidOnQuotes: 33804, balance: 0 })
  })
})
