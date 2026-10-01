import "server-only"
import { Prisma } from "@/generated/prisma/client"
import { db } from "@/lib/db"

// SQL mirror of totals.ts (keep the two in step; tests/integration/quote-sql.test.ts checks
// they agree). Sums happen in Postgres, never in the browser (CLAUDE.md).

export type QuoteTotalRow = {
  id: string
  customerId: string
  jobId: string | null
  number: number
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED"
  date: Date
  subtotal: number
  discount: number
  tax: number
  total: number
  paid: number
}

/** Per-quote totals and linked income for a business (optionally one customer / some ids). */
export async function quoteTotalsFor(
  businessId: string,
  filter: { customerId?: string; quoteIds?: string[] } = {}
): Promise<QuoteTotalRow[]> {
  const conds = [Prisma.sql`q."businessId" = ${businessId}`]
  if (filter.customerId) conds.push(Prisma.sql`q."customerId" = ${filter.customerId}`)
  if (filter.quoteIds) {
    if (filter.quoteIds.length === 0) return []
    conds.push(Prisma.sql`q.id IN (${Prisma.join(filter.quoteIds)})`)
  }
  const rows = await db.$queryRaw<
    {
      id: string
      customerId: string
      jobId: string | null
      number: number
      status: QuoteTotalRow["status"]
      date: Date
      subtotal: bigint
      discount: bigint
      tax: bigint
      paid: bigint
    }[]
  >`
    WITH sub AS (
      SELECT l."quoteId", COALESCE(SUM(ROUND(l.qty * l."unitPriceCents")), 0) AS subtotal
      FROM "QuoteLine" l
      WHERE l."businessId" = ${businessId} AND l."unitPriceCents" IS NOT NULL
      GROUP BY l."quoteId"
    ),
    paid AS (
      SELECT t."quoteId", SUM(t."amountCents") AS paid
      FROM "Transaction" t
      WHERE t."businessId" = ${businessId} AND t.type = 'INCOME' AND t."quoteId" IS NOT NULL
      GROUP BY t."quoteId"
    ),
    base AS (
      SELECT q.id, q."customerId", q."jobId", q.number, q.status, q.date, q."taxRateBps",
             COALESCE(s.subtotal, 0)::bigint AS subtotal,
             LEAST(GREATEST(q."discountCents", 0), COALESCE(s.subtotal, 0))::bigint AS discount,
             COALESCE(p.paid, 0)::bigint AS paid
      FROM "Quote" q
      LEFT JOIN sub s ON s."quoteId" = q.id
      LEFT JOIN paid p ON p."quoteId" = q.id
      WHERE ${Prisma.join(conds, " AND ")}
    )
    SELECT id, "customerId", "jobId", number, status, date, subtotal, discount, paid,
           ROUND((subtotal - discount) * "taxRateBps" / 10000.0)::bigint AS tax
    FROM base
    ORDER BY number DESC
  `
  return rows.map((r) => {
    const subtotal = Number(r.subtotal)
    const discount = Number(r.discount)
    const tax = Number(r.tax)
    return {
      id: r.id,
      customerId: r.customerId,
      jobId: r.jobId,
      number: r.number,
      status: r.status,
      date: r.date,
      subtotal,
      discount,
      tax,
      total: subtotal - discount + tax,
      paid: Number(r.paid),
    }
  })
}

/** Accepted work, money in and balance owed per customer (balance = unpaid part of accepted quotes). */
export async function customerBalances(
  businessId: string,
  customerId?: string
): Promise<Map<string, { accepted: number; paidOnQuotes: number; balance: number }>> {
  const rows = await quoteTotalsFor(businessId, { customerId })
  const map = new Map<string, { accepted: number; paidOnQuotes: number; balance: number }>()
  for (const r of rows) {
    if (r.status !== "ACCEPTED") continue
    const m = map.get(r.customerId) ?? { accepted: 0, paidOnQuotes: 0, balance: 0 }
    m.accepted += r.total
    m.paidOnQuotes += r.paid
    m.balance += Math.max(0, r.total - r.paid)
    map.set(r.customerId, m)
  }
  return map
}
