"use client"

import dynamic from "next/dynamic"
import { format, parseISO } from "date-fns"
import { formatMoney } from "@/lib/money"
import type { MonthMoney } from "../queries"

export { axisMoney } from "../chart-format"

// Recharts (~100 KB) loads after the page so the dashboard is usable sooner.
const MoneyBars = dynamic(() => import("./money-bars"), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse rounded-field bg-surface-muted" />,
})

/** Row 3: revenue vs expenses bars for the last 6 months (sums come from SQL). */
export function MoneyChart({ data, currency }: { data: MonthMoney[]; currency: string }) {
  const empty = data.every((d) => d.income === 0 && d.expenses === 0)
  const money = (c: number) => formatMoney(c, currency)
  return (
    <section className="min-w-0 rounded-card bg-surface p-5" aria-labelledby="money-title">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="money-title" className="text-[16px] font-semibold">
          Money in and out
        </h2>
        <ul className="flex gap-4 text-[12px] text-text-muted" aria-hidden>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-mint-ink" /> Revenue
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-danger" /> Expenses
          </li>
        </ul>
      </header>
      {empty ? (
        <p className="py-16 text-center text-[13px] text-text-subtle">
          Nothing recorded in the last 6 months.
        </p>
      ) : (
        <div className="h-[260px]" aria-hidden>
          <MoneyBars data={data} currency={currency} />
        </div>
      )}
      {/* the same numbers for screen readers and tests */}
      <table className="sr-only">
        <caption>Money in and out, last 6 months</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Revenue</th>
            <th>Expenses</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td>{format(parseISO(`${d.month}-01`), "MMMM yyyy")}</td>
              <td>{money(d.income)}</td>
              <td>{money(d.expenses)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
