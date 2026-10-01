import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import {
  acceptQuoteAction,
  createQuote,
  createQuoteAction,
  declineQuoteAction,
  deleteQuoteAction,
  markSentAction,
  reopenQuoteAction,
  saveQuoteAction,
} from "@/features/quotes/actions"
import { createTransactionAction, deleteTransactionAction } from "@/features/books/actions"
import { getQuoteForBuilder, listQuotes } from "@/features/quotes/queries"
import { seedSampleRecords } from "@/features/settings/sample-data"
import { createBusiness, resetDb, signInAs } from "./helpers"

beforeEach(resetDb)
afterEach(() => signInAs(null))

async function setup() {
  const t = await createBusiness()
  const customer = await db.customer.create({
    data: { businessId: t.business.id, name: "Sarah Mitchell" },
  })
  signInAs(t.owner)
  return { ...t, customer }
}

async function versionOf(id: string) {
  return (await db.quote.findUniqueOrThrow({ where: { id } })).updatedAt.toISOString()
}

const line = (name: string, qty: number, price: number | null) => ({
  catalogItemId: null as string | null,
  name,
  category: "Electrical",
  unit: "each",
  qty,
  unitPriceCents: price,
})

async function draftWith(
  customerId: string,
  lines: ReturnType<typeof line>[],
  extra: Record<string, unknown> = {}
) {
  const res = await createQuoteAction({ customerId })
  if (!res.ok) throw new Error(res.error)
  const id = res.data.id
  const save = await saveQuoteAction(id, {
    version: await versionOf(id),
    customerId,
    jobId: null,
    title: "Kitchen light fixtures",
    date: "2026-09-29",
    taxRateBps: 800,
    discountCents: 0,
    notes: "Customer supplies fixtures.",
    lines,
    ...extra,
  })
  if (!save.ok) throw new Error(save.error)
  return id
}

describe("quote numbers", () => {
  it("come from nextQuoteNumber, unique even when created at the same time", async () => {
    const { business, customer } = await setup()
    await db.business.update({ where: { id: business.id }, data: { nextQuoteNumber: 1007 } })
    const user = await requireUser()
    const made = await Promise.all(
      Array.from({ length: 5 }, () => createQuote(user, { customerId: customer.id }))
    )
    expect(made.map((q) => q.number).sort()).toEqual([1007, 1008, 1009, 1010, 1011])
    expect(
      (await db.business.findUniqueOrThrow({ where: { id: business.id } })).nextQuoteNumber
    ).toBe(1012)
    const q = await db.quote.findUniqueOrThrow({ where: { id: made[0].id } })
    expect(q).toMatchObject({ status: "DRAFT", taxRateBps: 800, footer: "Thanks" })
  })
})

describe("autosave", () => {
  it("saves header + lines and returns a new version", async () => {
    const { customer } = await setup()
    const id = await draftWith(customer.id, [
      line("Light Fixture Install", 3, 8500),
      line("Ceiling Fan Install", 1, null),
    ])
    const { quote, total } = (await getQuoteForBuilder((await requireUser()).businessId, id))!
    expect(quote.lines.map((l) => [l.name, Number(l.qty), l.unitPriceCents])).toEqual([
      ["Light Fixture Install", 3, 8500],
      ["Ceiling Fan Install", 1, null],
    ])
    expect(total).toBe(27540) // 255.00 + 8%
  })

  it("refuses a stale version instead of overwriting", async () => {
    const { customer } = await setup()
    const id = await draftWith(customer.id, [line("A", 1, 100)])
    const stale = "2000-01-01T00:00:00.000Z"
    const res = await saveQuoteAction(id, {
      version: stale,
      customerId: customer.id,
      jobId: null,
      title: null,
      date: "2026-09-29",
      taxRateBps: 800,
      discountCents: 0,
      notes: null,
      lines: [],
    })
    expect(res).toEqual({
      ok: false,
      error: "This quote was changed somewhere else. Reload to see the latest version.",
    })
  })

  it("validates lines and keeps only this business's catalog links", async () => {
    const { customer, business } = await setup()
    const other = await createBusiness()
    const theirCat = await db.catalogCategory.create({
      data: { businessId: other.business.id, name: "X" },
    })
    const theirItem = await db.catalogItem.create({
      data: {
        businessId: other.business.id,
        categoryId: theirCat.id,
        name: "Theirs",
        nameKey: "theirs",
      },
    })
    signInAs(await db.user.findFirstOrThrow({ where: { businessId: business.id, role: "OWNER" } }))
    const id = await draftWith(customer.id, [{ ...line("A", 1, 100), catalogItemId: theirItem.id }])
    expect(
      (await db.quoteLine.findFirstOrThrow({ where: { quoteId: id } })).catalogItemId
    ).toBeNull()
    const bad = await saveQuoteAction(id, {
      version: await versionOf(id),
      customerId: customer.id,
      jobId: null,
      title: null,
      date: "2026-09-29",
      taxRateBps: 800,
      discountCents: 0,
      notes: null,
      lines: [line("", 0, -5)],
    })
    expect(bad.ok).toBe(false)
  })
})

describe("status actions", () => {
  it("blocks sending and accepting while a line is unpriced (D6)", async () => {
    const { customer } = await setup()
    const id = await draftWith(customer.id, [
      line("Light Fixture Install", 3, 8500),
      line("Ceiling Fan Install", 1, null),
    ])
    expect(await markSentAction(id)).toEqual({
      ok: false,
      error: "Enter a price for 1 item first.",
    })
    expect(await acceptQuoteAction(id)).toEqual({
      ok: false,
      error: "Enter a price for 1 item first.",
    })
    const empty = await draftWith(customer.id, [])
    expect(await markSentAction(empty)).toEqual({
      ok: false,
      error: "Add at least one line first.",
    })
  })

  it("send -> accept creates a SCHEDULED job and writes activity", async () => {
    const { customer } = await setup()
    const id = await draftWith(customer.id, [line("Light Fixture Install", 3, 8500)])
    expect((await markSentAction(id)).ok).toBe(true)
    const res = await acceptQuoteAction(id)
    expect(res.ok && res.data.jobCreated).toBe(true)
    const q = await db.quote.findUniqueOrThrow({ where: { id }, include: { job: true } })
    expect(q.status).toBe("ACCEPTED")
    expect(q.job).toMatchObject({
      stage: "SCHEDULED",
      title: "Kitchen light fixtures",
      category: "Electrical",
    })
    const types = (
      await db.activity.findMany({ where: { entityId: id }, orderBy: { createdAt: "asc" } })
    ).map((a) => a.type)
    expect(types).toEqual(["QUOTE_SENT", "QUOTE_ACCEPTED"])
    // locked now
    const save = await saveQuoteAction(id, {
      version: await versionOf(id),
      customerId: customer.id,
      jobId: q.jobId,
      title: "x",
      date: "2026-09-29",
      taxRateBps: 0,
      discountCents: 0,
      notes: null,
      lines: [],
    })
    expect(save.ok).toBe(false)
    expect((await acceptQuoteAction(id)).ok).toBe(false)
  })

  it("accepting moves a linked Lead/Quoted job to Scheduled; sending moves a Lead to Quoted", async () => {
    const { customer, business } = await setup()
    const job = await db.job.create({
      data: { businessId: business.id, customerId: customer.id, title: "Faucet", stage: "LEAD" },
    })
    const id = await draftWith(customer.id, [line("Faucet Replacement", 1, 15000)], {
      jobId: job.id,
    })
    await markSentAction(id)
    expect((await db.job.findUniqueOrThrow({ where: { id: job.id } })).stage).toBe("QUOTED")
    const res = await acceptQuoteAction(id)
    expect(res.ok && res.data.jobCreated).toBe(false)
    expect((await db.job.findUniqueOrThrow({ where: { id: job.id } })).stage).toBe("SCHEDULED")
  })

  it("decline, reopen, and delete drafts only", async () => {
    const { customer } = await setup()
    const id = await draftWith(customer.id, [line("A", 1, 100)])
    expect((await declineQuoteAction(id)).ok).toBe(true)
    expect((await deleteQuoteAction(id)).ok).toBe(false)
    expect((await reopenQuoteAction(id)).ok).toBe(true)
    expect((await db.quote.findUniqueOrThrow({ where: { id } })).status).toBe("DRAFT")
    expect((await deleteQuoteAction(id)).ok).toBe(true)
  })

  it("can't act on another business's quotes or link their customers", async () => {
    const a = await setup()
    const id = await draftWith(a.customer.id, [line("A", 1, 100)])
    const b = await createBusiness()
    signInAs(b.owner)
    for (const act of [markSentAction, acceptQuoteAction, declineQuoteAction, deleteQuoteAction]) {
      expect((await act(id)).ok).toBe(false)
    }
    expect((await createQuoteAction({ customerId: a.customer.id })).ok).toBe(false)
  })
})

describe("payments against quotes", () => {
  it("records payments linked to the quote and says when it's paid in full", async () => {
    const { customer, business } = await setup()
    const id = await draftWith(customer.id, [line("TV Mount", 1, 31300)]) // 313.00 + 8% = 338.04
    await acceptQuoteAction(id)
    const pay = (amountCents: number, category: "DEPOSIT" | "JOB_PAYMENT") =>
      createTransactionAction({
        type: "INCOME",
        category,
        amountCents,
        date: "2026-09-29",
        description: "Payment for Q-1001",
        customerId: null,
        quoteId: id,
      })
    expect((await pay(10000, "DEPOSIT")).ok).toBe(true)
    expect((await pay(23804, "JOB_PAYMENT")).ok).toBe(true)
    const t = await db.transaction.findFirstOrThrow({ where: { quoteId: id, category: "DEPOSIT" } })
    expect(t.customerId).toBe(customer.id) // filled in from the quote
    const details = (
      await db.activity.findMany({
        where: { businessId: business.id, type: "PAYMENT_RECORDED" },
        orderBy: { createdAt: "asc" },
      })
    ).map((a) => a.detail)
    expect(details).toEqual(["$100.00 for Q-1001", "$238.04 for Q-1001, paid in full"])
    const { rows } = await listQuotes(business.id, { month: null })
    expect(rows[0]).toMatchObject({ number: 1001, total: 33804, paid: 33804, payment: "PAID" })
  })

  it("rejects mismatched links, expense-to-quote links and wrong categories; staff can't delete", async () => {
    const { customer, business, jordan } = await setup()
    const other = await db.customer.create({ data: { businessId: business.id, name: "Other" } })
    const id = await draftWith(customer.id, [line("A", 1, 100)])
    const base = { amountCents: 100, date: "2026-09-29", description: "x" }
    expect(
      (
        await createTransactionAction({
          ...base,
          type: "INCOME",
          category: "DEPOSIT",
          customerId: other.id,
          quoteId: id,
        })
      ).ok
    ).toBe(false)
    expect(
      (
        await createTransactionAction({
          ...base,
          type: "EXPENSE",
          category: "MATERIALS",
          customerId: null,
          quoteId: id,
        })
      ).ok
    ).toBe(false)
    expect(
      (
        await createTransactionAction({
          ...base,
          type: "EXPENSE",
          category: "DEPOSIT",
          customerId: null,
          quoteId: null,
        })
      ).ok
    ).toBe(false)
    const ok = await createTransactionAction({
      ...base,
      type: "EXPENSE",
      category: "FUEL_VEHICLE",
      customerId: null,
      quoteId: null,
    })
    expect(ok.ok).toBe(true)
    signInAs(jordan)
    expect(await deleteTransactionAction(ok.ok ? ok.data.id : "")).toEqual({
      ok: false,
      error: "Only the owner can do that.",
    })
  })
})

describe("quotes list", () => {
  it("matches the screenshot KPIs for the seed (with the corrected unpaid balance)", async () => {
    const { business, owner, jordan, alex } = await createBusiness()
    await seedSampleRecords(db, {
      businessId: business.id,
      timezone: business.timezone,
      today: "2026-09-29",
      team: { ownerId: owner.id, jordanId: jordan.id, alexId: alex.id },
    })
    const { rows, kpis } = await listQuotes(business.id, { month: null })
    expect(kpis).toEqual({
      drafts: 2,
      sent: 1,
      sentValue: 48060,
      accepted: 3,
      acceptedValue: 177984,
      unpaid: 84180,
      unpaidCount: 2,
    })
    expect(rows.find((r) => r.number === 1002)?.payment).toBe("PART_PAID")
    expect(rows.find((r) => r.number === 1001)?.payment).toBe("PAID")
    const sent = await listQuotes(business.id, { month: null, status: "SENT" })
    expect(sent.rows.map((r) => r.number)).toEqual([1003])
    const search = await listQuotes(business.id, { month: null, q: "oakwood" })
    expect(search.rows.map((r) => r.number)).toEqual([1002])
    const sept = await listQuotes(business.id, { month: "2026-09" })
    expect(sept.rows.map((r) => r.number).sort()).toEqual([1002, 1003, 1004, 1005, 1006])
  })
})
