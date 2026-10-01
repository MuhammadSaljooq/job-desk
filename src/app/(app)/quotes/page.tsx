import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { Plus } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { dayInZone } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { parseMonthParam } from "@/lib/month"
import { Button } from "@/components/ui/button"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { KpiCard } from "@/components/shared/kpi-card"
import { MonthPicker } from "@/components/shared/month-picker"
import { listQuotes } from "@/features/quotes/queries"
import { QUOTE_FILTERS, type QuoteFilter } from "@/features/quotes/schema"
import { QuotesTable } from "@/features/quotes/components/quotes-table"
import { QuoteStatusFilter } from "@/features/quotes/components/status-filter"

export const metadata: Metadata = { title: "Fast quotes" }

export default async function QuotesPage({ searchParams }: PageProps<"/quotes">) {
  const user = await requireUser()
  const sp = await searchParams
  const thisMonth = dayInZone(new Date(), user.timezone).slice(0, 7)
  // All time by default; the picker narrows to a month.
  const month = parseMonthParam(sp.month, null)
  const status = (QUOTE_FILTERS as readonly string[]).includes(String(sp.status))
    ? (sp.status as QuoteFilter)
    : "ALL"
  const q = typeof sp.q === "string" ? sp.q : undefined
  const { rows, kpis } = await listQuotes(user.businessId, { month, status, q })
  const money = (c: number) => formatMoney(c, user.currency)

  return (
    <>
      <Breadcrumb title="Fast quotes">
        <QuoteStatusFilter current={status} />
        <MonthPicker current={month} defaultMonth={thisMonth} allowAll />
        <Button asChild>
          <Link href="/quotes/new">
            <Plus /> New quote
          </Link>
        </Button>
      </Breadcrumb>
      <div className="mb-[18px] grid grid-cols-2 gap-[18px] lg:grid-cols-4">
        <KpiCard
          label="Drafts"
          value={kpis.drafts}
          caption="Still being written"
          href="/quotes?status=DRAFT"
        />
        <KpiCard
          label="Sent"
          value={kpis.sent}
          caption={`${money(kpis.sentValue)} waiting on a reply`}
          tone="sky"
          href="/quotes?status=SENT"
        />
        <KpiCard
          label="Accepted"
          value={kpis.accepted}
          caption={`${money(kpis.acceptedValue)} of work won`}
          tone="mint"
          href="/quotes?status=ACCEPTED"
        />
        <KpiCard
          label="Unpaid balance"
          value={money(kpis.unpaid)}
          caption={`Across ${kpis.unpaidCount} accepted quote${kpis.unpaidCount === 1 ? "" : "s"}`}
          tone="blush"
        />
      </div>
      <Suspense>
        <QuotesTable rows={rows} currency={user.currency} />
      </Suspense>
    </>
  )
}
