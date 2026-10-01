import "server-only"
import type { Prisma } from "@/generated/prisma/client"
import { db } from "@/lib/db"
import { dbDateToDay } from "@/lib/dates"
import { marginPercent } from "@/lib/money"
import { monthRange, type Month } from "@/lib/month"
import { CATEGORY_LABEL, type TxCategory, type TxType } from "./categories"

export type TxFilter = "ALL" | TxType

export type TxRow = {
  id: string
  type: TxType
  category: TxCategory
  amountCents: number
  date: string
  description: string
  customerId: string | null
  customerName: string | null
  quoteId: string | null
  quoteNumber: number | null
}

export type CategoryTotal = { category: TxCategory; label: string; cents: number; count: number }

/** ?type= on /books: "income" / "expense", anything else is All. */
export function parseTypeParam(value: unknown): TxFilter {
  if (value === "income") return "INCOME"
  if (value === "expense") return "EXPENSE"
  return "ALL"
}

function whereFor(
  businessId: string,
  opts: { month: Month | null; customerId?: string }
): Prisma.TransactionWhereInput {
  const range = opts.month ? monthRange(opts.month) : null
  return {
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
  }
}

/**
 * KPIs and category breakdowns for a period, summed in SQL with one groupBy (type, category).
 * The type filter only narrows the table, so the cards always show the whole period.
 */
export async function booksSummary(businessId: string, opts: { month: Month | null }) {
  const groups = await db.transaction.groupBy({
    by: ["type", "category"],
    where: whereFor(businessId, opts),
    _sum: { amountCents: true },
    _count: { _all: true },
  })
  const byType = (type: TxType): CategoryTotal[] =>
    groups
      .filter((g) => g.type === type)
      .map((g) => ({
        category: g.category as TxCategory,
        label: CATEGORY_LABEL[g.category as TxCategory],
        cents: g._sum.amountCents ?? 0,
        count: g._count._all,
      }))
      .sort((a, b) => b.cents - a.cents || a.label.localeCompare(b.label))
  const income = byType("INCOME")
  const expenses = byType("EXPENSE")
  const total = (list: CategoryTotal[]) => list.reduce((a, c) => a + c.cents, 0)
  const count = (list: CategoryTotal[]) => list.reduce((a, c) => a + c.count, 0)
  const revenue = total(income)
  const spent = total(expenses)
  return {
    revenue,
    revenueCount: count(income),
    expenses: spent,
    expenseCount: count(expenses),
    net: revenue - spent,
    margin: marginPercent(revenue - spent, revenue),
    income,
    spending: expenses,
  }
}

/** Ledger rows for a period, newest first. */
export async function listTransactions(
  businessId: string,
  opts: { month: Month | null; type?: TxFilter; customerId?: string }
): Promise<TxRow[]> {
  const rows = await db.transaction.findMany({
    where: {
      ...whereFor(businessId, opts),
      ...(opts.type && opts.type !== "ALL" ? { type: opts.type } : {}),
    },
    select: {
      id: true,
      type: true,
      category: true,
      amountCents: true,
      date: true,
      description: true,
      customerId: true,
      quoteId: true,
      customer: { select: { name: true } },
      quote: { select: { number: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  })
  return rows.map((t) => ({
    id: t.id,
    type: t.type,
    category: t.category as TxCategory,
    amountCents: t.amountCents,
    date: dbDateToDay(t.date),
    description: t.description,
    customerId: t.customerId,
    customerName: t.customer?.name ?? null,
    quoteId: t.quoteId,
    quoteNumber: t.quote?.number ?? null,
  }))
}

/** Customers and quotes the transaction form can link to (drafts can't take payments). */
export async function transactionLinkOptions(businessId: string) {
  const [customers, quotes] = await Promise.all([
    db.customer.findMany({
      where: { businessId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.quote.findMany({
      where: { businessId, status: { not: "DRAFT" } },
      select: { id: true, number: true, customerId: true },
      orderBy: { number: "desc" },
    }),
  ])
  return {
    customers,
    quotes: quotes.map((q) => ({ id: q.id, label: `Q-${q.number}`, customerId: q.customerId })),
  }
}
