import { cn } from "cn"
import { formatMoney } from "@/lib/money"
import type { CategoryTotal } from "../queries"

/** "Where the money went" / "Where it came from": one bar per category, scaled to the largest. */
export function BreakdownCard({
  title,
  rows,
  tone,
  currency,
  empty,
}: {
  title: string
  rows: CategoryTotal[]
  tone: "expense" | "income"
  currency: string
  empty: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.cents))
  const id = `breakdown-${tone}`
  return (
    <section className="rounded-card bg-surface p-5" aria-labelledby={id}>
      <h2 id={id} className="mb-4 text-[16px] font-semibold">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-[13px] text-text-subtle">{empty}</p>
      ) : (
        <ul className="grid gap-4">
          {rows.map((r) => (
            <li key={r.category}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[14px] font-medium">
                <span className="truncate">{r.label}</span>
                <span className="tabular">{formatMoney(r.cents, currency)}</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-surface-muted"
                role="presentation"
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    tone === "expense" ? "bg-danger" : "bg-mint-ink"
                  )}
                  style={{ width: `${Math.max(4, Math.round((r.cents / max) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
