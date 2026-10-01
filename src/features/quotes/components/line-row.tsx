"use client"

import { forwardRef } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X } from "lucide-react"
import { cn } from "cn"
import { formatMoney } from "@/lib/money"

export type DraftLine = {
  key: string
  catalogItemId: string | null
  name: string
  category: string | null
  unit: string | null
  qty: string
  price: string
  lastPriceCents: number | null
}

export type LineErrors = { name?: boolean; qty?: boolean; price?: boolean }

const field =
  "h-10 w-full rounded-[12px] bg-surface-muted px-3 text-[14px] font-medium outline-none placeholder:font-normal placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ink aria-invalid:ring-2 aria-invalid:ring-blush-ink disabled:opacity-70"

/** One editable quote line: drag handle, name, qty, hand-typed price, amount, remove. */
export const LineRow = forwardRef<
  HTMLInputElement,
  {
    line: DraftLine
    amountCents: number
    errors: LineErrors
    readOnly: boolean
    currency: string
    onChange: (patch: Partial<DraftLine>) => void
    onRemove: () => void
  }
>(function LineRow(
  { line, amountCents, errors, readOnly, currency, onChange, onRemove },
  priceRef
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: line.key,
    disabled: readOnly,
  })
  const sub = [line.category, line.unit && `per ${line.unit}`].filter(Boolean).join(", ")
  const pricePlaceholder =
    line.lastPriceCents !== null
      ? `last ${formatMoney(line.lastPriceCents, currency)}`
      : "type price"

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "grid grid-cols-[24px_minmax(0,1fr)_32px] items-center gap-x-2 gap-y-2 border-b border-divider py-3 md:grid-cols-[24px_minmax(0,1fr)_84px_140px_100px_32px]",
        isDragging && "relative z-10 rounded-[14px] bg-surface shadow-float"
      )}
      data-line-key={line.key}
    >
      <button
        type="button"
        aria-label={`Reorder ${line.name || "line"}`}
        disabled={readOnly}
        className="flex h-10 cursor-grab touch-none items-center justify-center rounded-[8px] text-text-subtle outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ink active:cursor-grabbing disabled:invisible"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0">
        <input
          value={line.name}
          disabled={readOnly}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-label="Line name"
          aria-invalid={errors.name || undefined}
          placeholder="Describe the work or item"
          className="h-8 w-full rounded-[8px] bg-transparent px-1 text-[14px] font-semibold outline-none placeholder:font-normal placeholder:text-text-subtle hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink aria-invalid:ring-2 aria-invalid:ring-blush-ink"
        />
        {sub && <p className="truncate px-1 text-[12px] text-text-muted">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={readOnly}
        aria-label={`Remove ${line.name || "line"}`}
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-text-muted outline-none hover:bg-surface-muted hover:text-text focus-visible:ring-2 focus-visible:ring-ink disabled:invisible md:order-last"
      >
        <X className="size-4" />
      </button>
      <div className="col-span-3 grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-2 pl-[32px] md:col-span-3 md:contents md:pl-0">
        <input
          value={line.qty}
          disabled={readOnly}
          inputMode="decimal"
          onChange={(e) => onChange({ qty: e.target.value })}
          aria-label={`Quantity for ${line.name || "line"}`}
          aria-invalid={errors.qty || undefined}
          className={cn(field, "tabular")}
        />
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[14px] text-text-muted">
            $
          </span>
          <input
            ref={priceRef}
            value={line.price}
            disabled={readOnly}
            inputMode="decimal"
            onChange={(e) => onChange({ price: e.target.value })}
            aria-label={`Your price for ${line.name || "line"}`}
            aria-invalid={errors.price || undefined}
            placeholder={pricePlaceholder}
            className={cn(field, "tabular pl-6", !line.price && !readOnly && "ring-1 ring-ink/25")}
          />
        </div>
        <p className="tabular text-right text-[14px] font-semibold md:pr-1">
          {line.price.trim() ? (
            formatMoney(amountCents, currency)
          ) : (
            <span className="text-text-subtle">{formatMoney(0, currency)}</span>
          )}
        </p>
      </div>
    </li>
  )
})
