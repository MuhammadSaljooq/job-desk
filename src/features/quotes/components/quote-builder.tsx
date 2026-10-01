"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { AlertTriangle, Check, CloudOff, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import { QuoteStatusPill } from "@/components/shared/status-pill"
import { centsToInput, formatBps, formatMoney, percentToBps, toCents } from "@/lib/money"
import { quoteTotals } from "../totals"
import { saveQuoteAction } from "../actions"
import { isEditable } from "../schema"
import { QuickAdd, type QuickItem } from "./quick-add"
import { LineRow, type DraftLine, type LineErrors } from "./line-row"
import { useAutosave, type SaveState } from "./use-autosave"
import { QuoteActions } from "./quote-actions"

export type BuilderQuote = {
  id: string
  number: number
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED"
  version: string
  customerId: string
  jobId: string | null
  title: string
  date: string
  taxRateBps: number
  discountCents: number
  notes: string
  paid: number
  lines: {
    catalogItemId: string | null
    name: string
    category: string | null
    unit: string | null
    qty: string
    unitPriceCents: number | null
  }[]
}

const NEW_JOB = "__new"
let keySeq = 0
const newKey = () => `l${Date.now().toString(36)}${(keySeq++).toString(36)}`

function parseQty(v: string): number | null {
  const s = v.trim().replace(",", ".")
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(s)) return null
  const n = Number(s)
  return n > 0 ? n : null
}

function parsePrice(v: string): { ok: boolean; cents: number | null } {
  if (!v.trim()) return { ok: true, cents: null }
  const c = toCents(v)
  return c === null || c < 0 ? { ok: false, cents: null } : { ok: true, cents: c }
}

/** The quote builder (shot-builder.png): Quick add on the left, the quote sheet on the right. */
export function QuoteBuilder({
  quote,
  items,
  categories,
  customers,
  jobsByCustomer,
  currency,
  today,
}: {
  quote: BuilderQuote
  items: QuickItem[]
  categories: string[]
  customers: { id: string; name: string }[]
  jobsByCustomer: Record<string, { id: string; title: string }[]>
  currency: string
  today: string
}) {
  const readOnly = !isEditable(quote.status)
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const [customerId, setCustomerId] = useState(quote.customerId)
  const [jobId, setJobId] = useState<string | null>(quote.jobId)
  const [title, setTitle] = useState(quote.title)
  const [date, setDate] = useState(quote.date)
  const [notes, setNotes] = useState(quote.notes)
  const [tax, setTax] = useState(formatBps(quote.taxRateBps).replace("%", ""))
  const [discount, setDiscount] = useState(
    quote.discountCents ? centsToInput(quote.discountCents) : ""
  )
  const [lines, setLines] = useState<DraftLine[]>(() =>
    // Stable keys for the server-rendered lines (Date.now() would differ between server and
    // browser and break hydration); new lines get generated keys in the browser only.
    quote.lines.map((l, i) => ({
      key: `init-${i}`,
      catalogItemId: l.catalogItemId,
      name: l.name,
      category: l.category,
      unit: l.unit,
      qty: String(Number(l.qty)),
      price: l.unitPriceCents === null ? "" : centsToInput(l.unitPriceCents),
      lastPriceCents: l.catalogItemId
        ? (itemById.get(l.catalogItemId)?.lastPriceCents ?? null)
        : null,
    }))
  )
  const version = useRef(quote.version)
  const priceRefs = useRef(new Map<string, HTMLInputElement | null>())

  // ---- derived values
  const parsed = lines.map((l) => ({
    qty: parseQty(l.qty),
    price: parsePrice(l.price),
    name: l.name.trim(),
  }))
  const lineErrors: LineErrors[] = parsed.map((p) => ({
    name: !p.name,
    qty: p.qty === null,
    price: !p.price.ok,
  }))
  const taxBps = percentToBps(tax || "0")
  const discountCents = discount.trim() ? toCents(discount) : 0
  const totals = quoteTotals(
    parsed.map((p) => ({ qty: p.qty ?? 0, unitPriceCents: p.price.cents })),
    { taxRateBps: taxBps ?? 0, discountCents: discountCents ?? 0 }
  )
  const headerInvalid = taxBps === null || discountCents === null || discountCents < 0 || !date
  const anyInvalid = headerInvalid || lineErrors.some((e) => e.name || e.qty || e.price)

  const autosave = useAutosave({
    build: () => {
      if (anyInvalid) return null
      return {
        version: version.current,
        customerId,
        jobId,
        title,
        date,
        taxRateBps: taxBps!,
        discountCents: discountCents!,
        notes,
        lines: lines.map((l, i) => ({
          catalogItemId: l.catalogItemId,
          name: l.name.trim(),
          category: l.category,
          unit: l.unit,
          qty: parsed[i].qty!,
          unitPriceCents: parsed[i].price.cents,
        })),
      }
    },
    save: async (payload) => {
      const res = await saveQuoteAction(quote.id, payload as Parameters<typeof saveQuoteAction>[1])
      if (res.ok) {
        version.current = res.data.version
        return { ok: true }
      }
      return { ok: false, error: res.error, conflict: res.error.includes("changed somewhere else") }
    },
  })
  const { touch } = autosave

  const editLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
    touch()
  }

  const addItem = useCallback(
    (item: QuickItem) => {
      const existing = lines.find((l) => l.catalogItemId === item.id)
      if (existing) {
        const next = Math.round(((parseQty(existing.qty) ?? 0) + 1) * 100) / 100
        setLines((ls) => ls.map((l) => (l.key === existing.key ? { ...l, qty: String(next) } : l)))
        toast.success(`${item.name}: quantity ${next}`)
      } else {
        const key = newKey()
        setLines((ls) => [
          ...ls,
          {
            key,
            catalogItemId: item.id,
            name: item.name,
            category: item.category,
            unit: item.unit,
            qty: "1",
            price: "",
            lastPriceCents: item.lastPriceCents,
          },
        ])
        toast.success(`Added ${item.name}. Enter your price.`)
        requestAnimationFrame(() => priceRefs.current.get(key)?.focus())
      }
      touch()
    },
    [lines, touch]
  )

  const addCustomLine = () => {
    const key = newKey()
    setLines((ls) => [
      ...ls,
      {
        key,
        catalogItemId: null,
        name: "",
        category: null,
        unit: null,
        qty: "1",
        price: "",
        lastPriceCents: null,
      },
    ])
    touch()
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLInputElement>(`[data-line-key="${key}"] input[aria-label="Line name"]`)
        ?.focus()
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    setLines((ls) => {
      const from = ls.findIndex((l) => l.key === e.active.id)
      const to = ls.findIndex((l) => l.key === e.over!.id)
      return arrayMove(ls, from, to)
    })
    touch()
  }

  const customerName = customers.find((c) => c.id === customerId)?.name ?? "Customer"
  const jobs = jobsByCustomer[customerId] ?? []
  const inQuote = new Set(lines.map((l) => l.catalogItemId).filter((v): v is string => !!v))

  return (
    <>
      <Breadcrumb
        title={`Quote Q-${quote.number}`}
        backHref="/quotes"
        badge={
          <span className="flex items-center gap-2">
            <QuoteStatusPill status={quote.status} />
            {!readOnly && <SaveIndicator state={autosave.state} />}
          </span>
        }
      >
        <QuoteActions
          quote={{
            id: quote.id,
            number: quote.number,
            status: quote.status,
            jobId,
            customerId,
            customerName,
          }}
          total={totals.total}
          paid={quote.paid}
          unpriced={totals.unpricedCount}
          lineCount={lines.length}
          flush={autosave.flush}
          currency={currency}
          today={today}
        />
      </Breadcrumb>

      {autosave.state === "conflict" && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card bg-blush px-5 py-3 text-[13px] text-blush-ink"
        >
          <span className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" /> {autosave.error}
          </span>
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      )}
      {readOnly && (
        <p className="mb-4 rounded-card bg-surface px-5 py-3 text-[13px] text-text-muted">
          {quote.status === "ACCEPTED"
            ? "This quote was accepted, so it's locked. Record payments against it from the top right."
            : "This quote was declined. Reopen it to make changes."}
        </p>
      )}

      <div
        className={cn(
          "grid grid-cols-1 items-start gap-[18px]",
          !readOnly && "lg:grid-cols-[380px_minmax(0,1fr)]"
        )}
      >
        {!readOnly && (
          <QuickAdd
            items={items}
            categories={categories}
            inQuote={inQuote}
            onAdd={addItem}
            currency={currency}
          />
        )}

        <section className="min-w-0 rounded-card bg-surface p-5" aria-label="Quote sheet">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_170px]">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="q-customer" className="text-[12px] font-medium text-text-muted">
                Customer
              </label>
              <Select
                value={customerId}
                disabled={readOnly}
                onValueChange={(v) => {
                  setCustomerId(v)
                  setJobId(null)
                  touch()
                }}
              >
                <SelectTrigger id="q-customer" className="w-full">
                  <span className="flex min-w-0 items-center gap-2">
                    <InitialsAvatar name={customerName} size="xs" className="size-6 text-[9px]" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="q-title" className="text-[12px] font-medium text-text-muted">
                Job title
              </label>
              <Input
                id="q-title"
                value={title}
                disabled={readOnly}
                maxLength={120}
                placeholder="e.g. Kitchen light fixtures"
                onChange={(e) => {
                  setTitle(e.target.value)
                  touch()
                }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="q-date" className="text-[12px] font-medium text-text-muted">
                Date
              </label>
              <Input
                id="q-date"
                type="date"
                value={date}
                disabled={readOnly}
                aria-invalid={!date || undefined}
                onChange={(e) => {
                  setDate(e.target.value)
                  touch()
                }}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-text-muted">
            <label htmlFor="q-job">When accepted:</label>
            <Select
              value={jobId ?? NEW_JOB}
              disabled={readOnly}
              onValueChange={(v) => {
                setJobId(v === NEW_JOB ? null : v)
                touch()
              }}
            >
              <SelectTrigger id="q-job" size="sm" className="h-8 max-w-full min-w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW_JOB}>Create a new scheduled job</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    Use job: {j.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-5 hidden grid-cols-[24px_minmax(0,1fr)_84px_140px_100px_32px] gap-x-2 border-b border-divider pb-2 text-[12.5px] text-text-muted md:grid">
            <span />
            <span>Item</span>
            <span>Qty</span>
            <span>Your price</span>
            <span className="pr-1 text-right">Amount</span>
            <span />
          </div>
          {lines.length === 0 ? (
            <div className="my-4 rounded-[16px] border-2 border-dashed border-divider px-4 py-8 text-center text-[13px] text-text-muted">
              {readOnly ? "No lines." : "Tap items in Quick add, or add a custom line."}
            </div>
          ) : (
            <DndContext
              id="quote-lines"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={lines.map((l) => l.key)}
                strategy={verticalListSortingStrategy}
              >
                <ul aria-label="Quote lines">
                  {lines.map((l, i) => (
                    <LineRow
                      key={l.key}
                      line={l}
                      amountCents={totals.lineAmounts[i]}
                      errors={lineErrors[i]}
                      readOnly={readOnly}
                      currency={currency}
                      ref={(el) => {
                        priceRefs.current.set(l.key, el)
                      }}
                      onChange={(patch) => editLine(l.key, patch)}
                      onRemove={() => {
                        setLines((ls) => ls.filter((x) => x.key !== l.key))
                        touch()
                      }}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
          {!readOnly && (
            <Button variant="muted" className="mt-4" onClick={addCustomLine}>
              <Plus /> Custom line
            </Button>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="q-notes" className="text-[12px] font-medium text-text-muted">
                Notes for the customer
              </label>
              <Textarea
                id="q-notes"
                rows={5}
                value={notes}
                disabled={readOnly}
                maxLength={4000}
                placeholder="What's included, what the customer supplies, timing…"
                onChange={(e) => {
                  setNotes(e.target.value)
                  touch()
                }}
                className="min-h-32"
              />
            </div>
            <dl className="flex flex-col gap-2.5 self-end text-[14px]" aria-label="Totals">
              <div className="flex items-center justify-between">
                <dt className="text-text-muted">Subtotal</dt>
                <dd className="tabular font-semibold">{formatMoney(totals.subtotal, currency)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>
                  <label htmlFor="q-discount" className="text-text-muted">
                    Discount
                  </label>
                </dt>
                <dd className="relative w-32">
                  <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text-muted">
                    $
                  </span>
                  <input
                    id="q-discount"
                    value={discount}
                    disabled={readOnly}
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-invalid={discountCents === null || undefined}
                    onChange={(e) => {
                      setDiscount(e.target.value)
                      touch()
                    }}
                    className="tabular h-9 w-full rounded-[10px] bg-surface-muted pr-2.5 pl-6 text-right text-[14px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ink aria-invalid:ring-2 aria-invalid:ring-blush-ink"
                  />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-text-muted">
                  <label htmlFor="q-tax">Tax</label>
                  <span className="relative">
                    <input
                      id="q-tax"
                      value={tax}
                      disabled={readOnly}
                      inputMode="decimal"
                      aria-invalid={taxBps === null || undefined}
                      onChange={(e) => {
                        setTax(e.target.value)
                        touch()
                      }}
                      className="tabular h-8 w-16 rounded-[8px] bg-surface-muted pr-5 pl-2 text-right text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ink aria-invalid:ring-2 aria-invalid:ring-blush-ink"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[12px]">
                      %
                    </span>
                  </span>
                </dt>
                <dd className="tabular font-semibold">{formatMoney(totals.tax, currency)}</dd>
              </div>
              <div className="mt-1 flex items-center justify-between border-t-2 border-ink pt-3">
                <dt className="text-[16px] font-bold">Total</dt>
                <dd className="tabular text-[22px] font-bold" data-testid="quote-total">
                  {formatMoney(totals.total, currency)}
                </dd>
              </div>
              {totals.discount < (discountCents ?? 0) && (
                <p className="text-right text-[12px] text-text-muted">
                  Discount is capped at the subtotal.
                </p>
              )}
            </dl>
          </div>
        </section>
      </div>
    </>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  const map: Record<SaveState, { icon: React.ReactNode; text: string; cls: string }> = {
    saved: { icon: <Check className="size-3.5" />, text: "Saved", cls: "text-text-muted" },
    dirty: { icon: null, text: "Unsaved changes", cls: "text-text-muted" },
    saving: {
      icon: <Loader2 className="size-3.5 animate-spin" />,
      text: "Saving…",
      cls: "text-text-muted",
    },
    invalid: {
      icon: <AlertTriangle className="size-3.5" />,
      text: "Fix the highlighted fields to save",
      cls: "text-blush-ink",
    },
    error: {
      icon: <CloudOff className="size-3.5" />,
      text: "Not saved. Retrying on your next change",
      cls: "text-blush-ink",
    },
    conflict: {
      icon: <AlertTriangle className="size-3.5" />,
      text: "Out of date",
      cls: "text-blush-ink",
    },
  }
  const s = map[state]
  return (
    <span
      className={cn("hidden items-center gap-1 text-[12px] font-medium sm:inline-flex", s.cls)}
      aria-live="polite"
      data-testid="save-state"
    >
      {s.icon} {s.text}
    </span>
  )
}
