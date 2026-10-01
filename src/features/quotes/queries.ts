import "server-only"
import { db } from "@/lib/db"
import { dbDateToDay } from "@/lib/dates"
import { monthRange } from "@/lib/month"
import { paymentState, type PaymentState } from "./totals"
import { quoteTotalsFor } from "./sql"
import type { QuoteFilter } from "./schema"

export type QuoteListRow = {
  id: string
  number: number
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED"
  customerId: string
  customerName: string
  jobTitle: string | null
  title: string | null
  date: string
  total: number
  paid: number
  payment: PaymentState
}

/** Quotes list rows + KPIs. Month filters by quote date; status and search filter the table. */
export async function listQuotes(
  businessId: string,
  opts: { month: string | null; status?: QuoteFilter; q?: string; customerId?: string }
) {
  const range = opts.month ? monthRange(opts.month) : null
  const quotes = await db.quote.findMany({
    where: {
      businessId,
      ...(opts.customerId ? { customerId: opts.customerId } : {}),
      ...(range
        ? {
            date: {
              gte: new Date(`${range.start}T00:00:00Z`),
              lt: new Date(`${range.end}T00:00:00Z`),
            },
          }
        : {}),
    },
    select: {
      id: true,
      number: true,
      status: true,
      title: true,
      date: true,
      customerId: true,
      customer: { select: { name: true } },
      job: { select: { title: true } },
    },
    orderBy: [{ date: "desc" }, { number: "desc" }],
  })
  const totals = new Map(
    (await quoteTotalsFor(businessId, { quoteIds: quotes.map((q) => q.id) })).map((t) => [t.id, t])
  )
  const all: QuoteListRow[] = quotes.map((q) => {
    const t = totals.get(q.id)
    const total = t?.total ?? 0
    const paid = t?.paid ?? 0
    return {
      id: q.id,
      number: q.number,
      status: q.status,
      customerId: q.customerId,
      customerName: q.customer.name,
      jobTitle: q.job?.title ?? null,
      title: q.title,
      date: dbDateToDay(q.date),
      total,
      paid,
      payment: paymentState(q.status, total, paid),
    }
  })

  const accepted = all.filter((r) => r.status === "ACCEPTED")
  const owing = accepted.filter((r) => r.total > r.paid)
  const kpis = {
    drafts: all.filter((r) => r.status === "DRAFT").length,
    sent: all.filter((r) => r.status === "SENT").length,
    sentValue: all.filter((r) => r.status === "SENT").reduce((a, r) => a + r.total, 0),
    accepted: accepted.length,
    acceptedValue: accepted.reduce((a, r) => a + r.total, 0),
    unpaid: owing.reduce((a, r) => a + (r.total - r.paid), 0),
    unpaidCount: owing.length,
  }

  const text = opts.q?.trim().toLowerCase()
  const rows = all.filter(
    (r) =>
      (!opts.status || opts.status === "ALL" || r.status === opts.status) &&
      (!text ||
        `q-${r.number}`.includes(text) ||
        String(r.number).includes(text) ||
        r.customerName.toLowerCase().includes(text) ||
        (r.title ?? "").toLowerCase().includes(text) ||
        (r.jobTitle ?? "").toLowerCase().includes(text))
  )
  return { rows, kpis }
}

/** Everything the builder needs for one quote, or null if it isn't in this business. */
export async function getQuoteForBuilder(businessId: string, quoteId: string) {
  const q = await db.quote.findFirst({
    where: { id: quoteId, businessId },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      customer: { select: { id: true, name: true, email: true, phone: true, address: true } },
      job: { select: { id: true, title: true, stage: true } },
    },
  })
  if (!q) return null
  const [t] = await quoteTotalsFor(businessId, { quoteIds: [q.id] })
  return { quote: q, paid: t?.paid ?? 0, total: t?.total ?? 0 }
}
