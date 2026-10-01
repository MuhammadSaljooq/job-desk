import { BarChart3, Check, ChevronRight, FileText, Minus, Package } from "lucide-react"
import { format, parseISO } from "date-fns"
import { DetailRow } from "@/components/shared/detail-row"
import { StatusPill } from "@/components/shared/status-pill"
import { formatMoney } from "@/lib/money"

/** Row 2 left: "This month" money and work figures; each row opens the filtered page. */
export function MonthCard({
  month,
  isThisMonth,
  currency,
  revenue,
  expenses,
  net,
  margin,
  openQuotes,
  activeJobs,
  scheduledJobs,
}: {
  month: string
  isThisMonth: boolean
  currency: string
  revenue: number
  expenses: number
  net: number
  margin: number | null
  openQuotes: { count: number; value: number }
  activeJobs: number
  scheduledJobs: number
}) {
  const money = (c: number) => formatMoney(c, currency)
  const chevron = <ChevronRight className="size-4" aria-hidden />
  const label = format(parseISO(`${month}-01`), "MMMM yyyy")
  return (
    <section className="min-w-0 rounded-card bg-surface p-5" aria-labelledby="month-title">
      <header className="mb-1 flex min-h-8 items-center justify-between gap-3">
        <h2 id="month-title" className="text-[16px] font-semibold">
          {isThisMonth ? "This month" : label}
        </h2>
        <StatusPill tone="neutral">{format(parseISO(`${month}-01`), "MMM yyyy")}</StatusPill>
      </header>
      <DetailRow
        icon={<BarChart3 />}
        label="Revenue"
        value={money(revenue)}
        href={`/books?month=${month}&type=income`}
        action={chevron}
      />
      <DetailRow
        icon={<Minus />}
        label="Expenses"
        value={money(expenses)}
        href={`/books?month=${month}&type=expense`}
        action={chevron}
      />
      <DetailRow
        icon={<Check />}
        label="Net profit"
        value={money(net)}
        href={`/books?month=${month}`}
        pill={
          margin !== null && (
            <StatusPill tone={margin >= 0 ? "mint" : "blush"}>{margin}%</StatusPill>
          )
        }
        action={chevron}
      />
      <DetailRow
        icon={<FileText />}
        label="Open quotes"
        value={`${money(openQuotes.value)} across ${openQuotes.count} ${
          openQuotes.count === 1 ? "quote" : "quotes"
        }`}
        href="/quotes?status=SENT"
        action={chevron}
      />
      <DetailRow
        icon={<Package />}
        label="Active jobs"
        value={`${activeJobs} ${activeJobs === 1 ? "job" : "jobs"}, ${scheduledJobs} scheduled`}
        href="/calendar"
        action={chevron}
      />
    </section>
  )
}
