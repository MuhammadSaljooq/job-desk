import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { dayInZone } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { monthLabel, parseMonthParam } from "@/lib/month"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { KpiCard } from "@/components/shared/kpi-card"
import { MonthPicker } from "@/components/shared/month-picker"
import {
  booksSummary,
  listTransactions,
  parseTypeParam,
  transactionLinkOptions,
} from "@/features/books/queries"
import { BreakdownCard } from "@/features/books/components/breakdown-card"
import { EntryButtons } from "@/features/books/components/entry-buttons"
import { TransactionsCard } from "@/features/books/components/transactions-card"

export const metadata: Metadata = { title: "Bookkeeping" }

export default async function BooksPage({ searchParams }: PageProps<"/books">) {
  const user = await requireUser()
  const sp = await searchParams
  const today = dayInZone(new Date(), user.timezone)
  const thisMonth = today.slice(0, 7)
  // This month by default (shot-books.png); the picker also offers All time.
  const month = parseMonthParam(sp.month, thisMonth)
  const type = parseTypeParam(sp.type)
  const [summary, rows, links] = await Promise.all([
    booksSummary(user.businessId, { month }),
    listTransactions(user.businessId, { month, type }),
    transactionLinkOptions(user.businessId),
  ])
  const money = (c: number) => formatMoney(c, user.currency)
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

  return (
    <>
      <Breadcrumb title="Bookkeeping">
        <MonthPicker current={month} defaultMonth={thisMonth} allowAll />
        <EntryButtons today={today} links={links} />
      </Breadcrumb>
      <div className="mb-[18px] grid grid-cols-2 gap-4 md:gap-[18px] lg:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={money(summary.revenue)}
          caption={plural(summary.revenueCount, "payment", "payments")}
          tone="mint"
        />
        <KpiCard
          label="Expenses"
          value={money(summary.expenses)}
          caption={plural(summary.expenseCount, "entry", "entries")}
          tone="blush"
        />
        <KpiCard label="Net profit" value={money(summary.net)} caption={monthLabel(month)} />
        <KpiCard
          label="Profit margin"
          value={summary.margin === null ? "None" : `${summary.margin}%`}
          caption="Net profit as a share of revenue"
          tone="sky"
        />
      </div>
      <div className="grid gap-4 md:gap-[18px] lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <TransactionsCard
          rows={rows}
          month={month}
          type={type}
          currency={user.currency}
          canDelete={user.role === "OWNER"}
          today={today}
          links={links}
        />
        <div className="grid gap-4 md:gap-[18px]">
          <BreakdownCard
            title="Where the money went"
            rows={summary.spending}
            tone="expense"
            currency={user.currency}
            empty="No expenses in this period."
          />
          <BreakdownCard
            title="Where it came from"
            rows={summary.income}
            tone="income"
            currency={user.currency}
            empty="No revenue in this period."
          />
        </div>
      </div>
    </>
  )
}
