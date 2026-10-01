"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, Pencil, ReceiptText, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusPill } from "@/components/shared/status-pill"
import { formatDay, formatDayShort } from "@/lib/dates"
import { formatSigned } from "@/lib/money"
import { CATEGORY_LABEL } from "../categories"
import { deleteTransactionAction } from "../actions"
import type { TxFilter, TxRow } from "../queries"
import { TransactionDialog } from "./transaction-dialog"
import { blankEntry } from "../entry"
import type { LinkOptions } from "./entry-buttons"

const FILTERS: { value: TxFilter; label: string; param: string | null }[] = [
  { value: "ALL", label: "All", param: null },
  { value: "INCOME", label: "Revenue", param: "income" },
  { value: "EXPENSE", label: "Expenses", param: "expense" },
]

/** Transactions card on /books (shot-books.png): All / Revenue / Expenses, table, edit, delete. */
export function TransactionsCard({
  rows,
  month,
  type,
  currency,
  canDelete,
  today,
  links,
  basePath = "/books",
  title = "Transactions",
  showFilter = true,
  showCustomer = true,
  newEntry,
}: {
  rows: TxRow[]
  /** null = all time */
  month: string | null
  type: TxFilter
  currency: string
  canDelete: boolean
  today: string
  links: LinkOptions
  basePath?: string
  title?: string
  showFilter?: boolean
  showCustomer?: boolean
  /** what the empty state's button records (defaults from the filter) */
  newEntry?: Parameters<typeof TransactionDialog>[0]["initial"]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<TxRow | null>(null)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<TxRow | null>(null)

  const href = (param: string | null) => {
    const sp = new URLSearchParams()
    if (month) sp.set("month", month)
    else sp.set("month", "all")
    if (param) sp.set("type", param)
    return `${basePath}?${sp}`
  }
  const exportHref = `/api/books/export?month=${month ?? "all"}${
    type === "ALL" ? "" : `&type=${type === "INCOME" ? "income" : "expense"}`
  }`
  const showDay = month ? formatDayShort : formatDay
  const emptyType = type === "EXPENSE" ? "EXPENSE" : "INCOME"

  return (
    <section className="min-w-0 rounded-card bg-surface p-5" aria-labelledby="tx-title">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="tx-title" className="text-[16px] font-semibold">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {showFilter && (
            <nav
              aria-label="Show"
              className="inline-flex rounded-full bg-surface-muted p-1 text-[13px] font-medium"
            >
              {FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={href(f.param)}
                  replace
                  scroll={false}
                  aria-current={type === f.value ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full px-4 outline-none focus-visible:ring-2 focus-visible:ring-ink",
                    type === f.value
                      ? "bg-ink font-semibold text-surface"
                      : "text-text-muted hover:text-text"
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          )}
          {showFilter && rows.length > 0 && (
            <Button variant="secondary" size="sm" className="bg-surface-muted" asChild>
              <a href={exportHref} download>
                <Download /> Export CSV
              </a>
            </Button>
          )}
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ReceiptText />}
          title={
            type === "EXPENSE"
              ? "No expenses here yet"
              : type === "INCOME"
                ? "No payments here yet"
                : "Nothing recorded yet"
          }
          description="Every payment and expense you log shows up here."
          action={
            <Button onClick={() => setAdding(true)}>
              {emptyType === "EXPENSE" ? "Log expense" : "Record revenue"}
            </Button>
          }
        />
      ) : (
        <>
          {/* phones: one stacked row per entry */}
          <ul className="-mx-1 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-2 border-t border-divider py-3 pl-1">
                <button
                  type="button"
                  onClick={() => setEditing(r)}
                  aria-label={`Edit ${r.description}`}
                  className="min-w-0 flex-1 cursor-pointer rounded-field text-left outline-none focus-visible:ring-2 focus-visible:ring-ink"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[14px] font-medium">{r.description}</span>
                    <span
                      className={cn(
                        "tabular shrink-0 text-[14px] font-semibold",
                        r.type === "INCOME" ? "text-mint-ink" : "text-blush-ink"
                      )}
                    >
                      {formatSigned(r.amountCents, r.type, currency)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-text-muted">
                    {[
                      showDay(r.date),
                      CATEGORY_LABEL[r.category],
                      showCustomer ? r.customerName : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
                {canDelete && (
                  <RowButton label={`Delete ${r.description}`} onClick={() => setDeleting(r)}>
                    <Trash2 />
                  </RowButton>
                )}
              </li>
            ))}
          </ul>
          <div className="relative -mx-2 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-[14px]">
              <thead>
                <tr className="text-left text-[12.5px] text-text-muted">
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Description</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  {showCustomer && <th className="px-3 py-2.5 font-medium">Customer</th>}
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                  <th className="w-[84px] px-3 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-divider">
                    <td className="tabular px-3 py-3 whitespace-nowrap text-text-muted">
                      {showDay(r.date)}
                    </td>
                    <td className="max-w-[280px] truncate px-3 py-3 font-medium">
                      {r.description}
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill tone={r.type === "INCOME" ? "mint" : "neutral"}>
                        {CATEGORY_LABEL[r.category]}
                      </StatusPill>
                    </td>
                    {showCustomer && (
                      <td className="max-w-[200px] truncate px-3 py-3 text-text-muted">
                        {r.customerName ?? <span className="text-text-subtle">None</span>}
                      </td>
                    )}
                    <td
                      className={cn(
                        "tabular px-3 py-3 text-right font-semibold whitespace-nowrap",
                        r.type === "INCOME" ? "text-mint-ink" : "text-blush-ink"
                      )}
                    >
                      {formatSigned(r.amountCents, r.type, currency)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <RowButton label={`Edit ${r.description}`} onClick={() => setEditing(r)}>
                          <Pencil />
                        </RowButton>
                        {canDelete && (
                          <RowButton
                            label={`Delete ${r.description}`}
                            onClick={() => setDeleting(r)}
                          >
                            <Trash2 />
                          </RowButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <TransactionDialog
        open={adding || editing !== null}
        onOpenChange={(o) => {
          if (!o) {
            setAdding(false)
            setEditing(null)
          }
        }}
        transactionId={editing?.id}
        initial={
          editing
            ? {
                type: editing.type,
                category: editing.category,
                amountCents: editing.amountCents,
                date: editing.date,
                description: editing.description,
                customerId: editing.customerId,
                quoteId: editing.quoteId,
              }
            : (newEntry ?? blankEntry(emptyType, today))
        }
        customers={links.customers}
        quotes={links.quotes}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this entry?"
        description={
          deleting
            ? `“${deleting.description}”, ${formatSigned(deleting.amountCents, deleting.type, currency)}. This can't be undone.`
            : ""
        }
        onConfirm={async () => {
          if (!deleting) return
          const res = await deleteTransactionAction(deleting.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Entry deleted")
          setDeleting(null)
          router.refresh()
        }}
      />
    </section>
  )
}

function RowButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-text-muted outline-none hover:bg-surface-muted hover:text-text focus-visible:ring-2 focus-visible:ring-ink [&_svg]:size-4"
    >
      {children}
    </button>
  )
}
