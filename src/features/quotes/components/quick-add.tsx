"use client"

import { useMemo, useState } from "react"
import { Check, Plus, Search } from "lucide-react"
import { cn } from "cn"
import { formatMoney } from "@/lib/money"

export type QuickItem = {
  id: string
  name: string
  category: string
  unit: string
  lastPriceCents: number | null
}

/** Left card: search, category pills, item rows. Tap to add; tap again adds +1 qty. */
export function QuickAdd({
  items,
  categories,
  inQuote,
  onAdd,
  disabled,
  currency,
}: {
  items: QuickItem[]
  categories: string[]
  inQuote: Set<string>
  onAdd: (item: QuickItem) => void
  disabled?: boolean
  currency: string
}) {
  const [q, setQ] = useState("")
  const [cat, setCat] = useState<string | null>(null)
  const shown = useMemo(() => {
    const text = q.trim().toLowerCase()
    return items.filter(
      (i) =>
        (!cat || i.category === cat) &&
        (!text || i.name.toLowerCase().includes(text) || i.category.toLowerCase().includes(text))
    )
  }, [items, q, cat])

  return (
    <section
      className="min-w-0 rounded-card bg-surface p-5 lg:sticky lg:top-4"
      aria-labelledby="quickadd-title"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 id="quickadd-title" className="text-[16px] font-semibold">
          Quick add
        </h2>
        <span className="text-[12.5px] text-text-muted">{items.length} items</span>
      </header>
      <label className="relative flex h-10 items-center">
        <span className="sr-only">Search services and supplies</span>
        <Search className="pointer-events-none absolute left-3.5 size-4 text-text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search services and supplies"
          className="h-10 w-full rounded-full bg-surface-muted pr-3 pl-10 text-[13px] outline-none placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ink"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Categories">
        {[null, ...categories].map((c) => (
          <button
            key={c ?? "all"}
            type="button"
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
            className={cn(
              "h-8 cursor-pointer rounded-full px-3 text-[12.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink",
              cat === c
                ? "bg-ink text-ink-foreground"
                : "bg-surface-muted text-text hover:bg-divider"
            )}
          >
            {c ?? "All"}
          </button>
        ))}
      </div>
      <ul
        className="mt-3 flex max-h-[min(60dvh,560px)] flex-col gap-1 overflow-y-auto"
        aria-label="Items"
      >
        {shown.length === 0 && (
          <li className="px-2 py-6 text-center text-[13px] text-text-muted">
            {items.length
              ? "No items match."
              : "Your item list is empty. Add items in the catalog."}
          </li>
        )}
        {shown.map((i) => {
          const added = inQuote.has(i.id)
          return (
            <li key={i.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAdd(i)}
                aria-label={`${added ? "Add another" : "Add"} ${i.name}`}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-default disabled:opacity-60",
                  added ? "bg-surface-muted" : "hover:bg-surface-muted"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{i.name}</span>
                  <span className="block truncate text-[12px] text-text-muted">
                    Per {i.unit}
                    {i.lastPriceCents !== null &&
                      `, last quoted ${formatMoney(i.lastPriceCents, currency)}`}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    added ? "bg-ink text-ink-foreground" : "bg-surface-muted text-text"
                  )}
                  aria-hidden
                >
                  {added ? <Check className="size-4" /> : <Plus className="size-4" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
