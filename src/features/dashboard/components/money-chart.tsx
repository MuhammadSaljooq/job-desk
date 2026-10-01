"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { cn } from "cn"
import { formatMoney } from "@/lib/money"
import type { MonthMoney } from "../queries"

const monthShort = (m: string) => format(parseISO(`${m}-01`), "MMM")

/** Compact axis labels from cents: 60000 -> "$600", 150000 -> "$1.5k". */
export function axisMoney(cents: number): string {
  const dollars = cents / 100
  return dollars >= 1000 ? `$${Number((dollars / 1000).toFixed(1))}k` : `$${Math.round(dollars)}`
}

/** Row 3: revenue vs expenses bars for the last 6 months (sums come from SQL). */
export function MoneyChart({ data, currency }: { data: MonthMoney[]; currency: string }) {
  const rows = data.map((d) => ({ ...d, label: monthShort(d.month) }))
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} barGap={3} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--divider)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              />
              <YAxis
                width={52}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                tickFormatter={axisMoney}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-muted)" }}
                formatter={(v, name) => [
                  money(Number(v)),
                  name === "income" ? "Revenue" : "Expenses",
                ]}
                contentStyle={{
                  background: "var(--surface)",
                  border: "none",
                  borderRadius: 12,
                  boxShadow: "0 8px 24px rgb(0 0 0 / .12)",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="income" fill="var(--mint-ink)" radius={[6, 6, 0, 0]} maxBarSize={18} />
              <Bar dataKey="expenses" fill="var(--danger)" radius={[6, 6, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* the same numbers for screen readers and tests */}
      <table className={cn("sr-only")}>
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
