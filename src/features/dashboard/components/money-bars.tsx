"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { formatMoney } from "@/lib/money"
import { axisMoney } from "../chart-format"
import type { MonthMoney } from "../queries"

const monthShort = (m: string) => format(parseISO(`${m}-01`), "MMM")

/** The Recharts part of the money chart, loaded after the page (it's ~100 KB of JS). */
export default function MoneyBars({ data, currency }: { data: MonthMoney[]; currency: string }) {
  const rows = data.map((d) => ({ ...d, label: monthShort(d.month) }))
  return (
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
            formatMoney(Number(v), currency),
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
  )
}
