import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "@/features/books/actions"
import { booksSummary, listTransactions, transactionLinkOptions } from "@/features/books/queries"
import { seedSampleRecords } from "@/features/settings/sample-data"
import { createBusiness, resetDb, signInAs } from "./helpers"

beforeEach(resetDb)
afterEach(() => signInAs(null))

async function seeded() {
  const t = await createBusiness()
  await seedSampleRecords(db, {
    businessId: t.business.id,
    timezone: t.business.timezone,
    today: "2026-09-29",
    team: { ownerId: t.owner.id, jordanId: t.jordan.id, alexId: t.alex.id },
  })
  return t
}

const expense = (over: Record<string, unknown> = {}) => ({
  type: "EXPENSE" as const,
  category: "FUEL_VEHICLE" as const,
  amountCents: 4210,
  date: "2026-09-12",
  description: "Fuel",
  customerId: null,
  quoteId: null,
  ...over,
})

describe("books summary", () => {
  it("matches shot-books.png for September (with the corrected expense total)", async () => {
    const { business } = await seeded()
    const s = await booksSummary(business.id, { month: "2026-09" })
    expect(s).toMatchObject({
      revenue: 93804,
      revenueCount: 3,
      // the screenshot says $661.50, but its own category bars add up to $650.74
      expenses: 65074,
      expenseCount: 6,
      net: 28730,
      margin: 31,
    })
    expect(s.spending.map((c) => [c.label, c.cents])).toEqual([
      ["Materials", 27465],
      ["Insurance", 14500],
      ["Tools & Equipment", 13999],
      ["Fuel & Vehicle", 6210],
      ["Software", 2900],
    ])
    expect(s.income.map((c) => [c.label, c.cents])).toEqual([
      ["Deposit", 60000],
      ["Job Payment", 33804],
    ])
  })

  it("covers all 22 seeded entries for all time, and no margin without revenue", async () => {
    const { business } = await seeded()
    const all = await booksSummary(business.id, { month: null })
    expect(all.revenueCount + all.expenseCount).toBe(22)
    expect(all.revenue).toBe(676804)
    expect(all.expenses).toBe(172874)
    const empty = await booksSummary(business.id, { month: "2020-01" })
    expect(empty).toMatchObject({ revenue: 0, expenses: 0, net: 0, margin: null })
  })
})

describe("transactions list", () => {
  it("lists a month newest first and filters by type and customer", async () => {
    const { business } = await seeded()
    const rows = await listTransactions(business.id, { month: "2026-09" })
    expect(rows).toHaveLength(9)
    expect(rows[0]).toMatchObject({
      description: "Deposit for Q-1004",
      date: "2026-09-28",
      customerName: "David Chen",
      quoteNumber: 1004,
    })
    expect(rows.map((r) => r.date)).toEqual([...rows.map((r) => r.date)].sort().reverse())
    const income = await listTransactions(business.id, { month: "2026-09", type: "INCOME" })
    expect(income.every((r) => r.type === "INCOME")).toBe(true)
    expect(income).toHaveLength(3)
    const oakwood = await db.customer.findFirstOrThrow({
      where: { businessId: business.id, name: "Oakwood Property Mgmt" },
    })
    const payments = await listTransactions(business.id, {
      month: null,
      type: "INCOME",
      customerId: oakwood.id,
    })
    expect(payments.map((r) => r.amountCents)).toEqual([50000, 64000, 98000])
  })

  it("uses month boundaries on the business-local day", async () => {
    const { business, owner } = await createBusiness()
    signInAs(owner)
    for (const date of ["2026-08-31", "2026-09-01", "2026-09-30", "2026-10-01"]) {
      expect((await createTransactionAction(expense({ date, description: date }))).ok).toBe(true)
    }
    const rows = await listTransactions(business.id, { month: "2026-09" })
    expect(rows.map((r) => r.description)).toEqual(["2026-09-30", "2026-09-01"])
  })

  it("offers only this business's customers and non-draft quotes as links", async () => {
    const { business } = await seeded()
    const other = await seeded()
    const links = await transactionLinkOptions(business.id)
    expect(links.customers).toHaveLength(
      await db.customer.count({ where: { businessId: business.id } })
    )
    expect(links.quotes.map((q) => q.label)).toEqual(["Q-1004", "Q-1003", "Q-1002", "Q-1001"])
    const otherIds = new Set(
      (await db.customer.findMany({ where: { businessId: other.business.id } })).map((c) => c.id)
    )
    expect(links.customers.some((c) => otherIds.has(c.id))).toBe(false)
  })
})

describe("ledger actions", () => {
  it("edits an entry and moves it between categories and types", async () => {
    const { business, jordan } = await createBusiness()
    signInAs(jordan) // staff can record and edit
    const res = await createTransactionAction(expense())
    if (!res.ok) throw new Error(res.error)
    const upd = await updateTransactionAction(
      res.data.id,
      expense({ type: "INCOME", category: "OTHER_INCOME", amountCents: 2500, description: "Scrap" })
    )
    expect(upd.ok).toBe(true)
    const s = await booksSummary(business.id, { month: "2026-09" })
    expect(s).toMatchObject({ revenue: 2500, expenses: 0, revenueCount: 1, expenseCount: 0 })
  })

  it("only the owner deletes, and never another business's entries", async () => {
    const { business, owner, jordan } = await createBusiness()
    signInAs(owner)
    const res = await createTransactionAction(expense())
    if (!res.ok) throw new Error(res.error)
    signInAs(jordan)
    expect((await deleteTransactionAction(res.data.id)).ok).toBe(false)
    const b = await createBusiness()
    signInAs(b.owner)
    expect((await deleteTransactionAction(res.data.id)).ok).toBe(false)
    expect((await updateTransactionAction(res.data.id, expense({ amountCents: 1 }))).ok).toBe(false)
    expect(await listTransactions(b.business.id, { month: null })).toHaveLength(0)
    signInAs(owner)
    expect((await deleteTransactionAction(res.data.id)).ok).toBe(true)
    expect(await listTransactions(business.id, { month: null })).toHaveLength(0)
  })
})
