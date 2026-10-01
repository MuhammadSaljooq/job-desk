"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FileText, Loader2, Plus, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import { PaymentPill, QuoteStatusPill } from "@/components/shared/status-pill"
import { formatDay } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import type { QuoteListRow } from "../queries"

/** "All quotes" card: search (URL ?q) + table rows that open the builder. */
export function QuotesTable({
  rows,
  currency,
  title = "All quotes",
  showCustomer = true,
  newHref = "/quotes/new",
}: {
  rows: QuoteListRow[]
  currency: string
  title?: string
  showCustomer?: boolean
  newHref?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get("q") ?? "")
  const [pending, start] = useTransition()
  const urlQ = params.get("q") ?? ""

  useEffect(() => {
    if (q.trim() === urlQ) return
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params.toString())
      if (q.trim()) sp.set("q", q.trim())
      else sp.delete("q")
      start(() => router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false }))
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on text only
  }, [q])

  return (
    <section className="min-w-0 rounded-card bg-surface p-5" aria-labelledby="quotes-title">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="quotes-title" className="text-[16px] font-semibold">
          {title}
        </h2>
        <label className="relative flex h-10 w-full items-center sm:w-[300px]">
          <span className="sr-only">Search quotes</span>
          {pending ? (
            <Loader2 className="pointer-events-none absolute left-3.5 size-4 animate-spin text-text-muted" />
          ) : (
            <Search className="pointer-events-none absolute left-3.5 size-4 text-text-muted" />
          )}
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search quotes"
            className="h-10 w-full rounded-full bg-surface-muted pr-3 pl-10 text-[13px] outline-none placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ink"
          />
        </label>
      </header>
      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title={urlQ ? "No quotes match" : "No quotes yet"}
          description={
            urlQ ? `Nothing for “${urlQ}”.` : "Pick items from your list, type your price, done."
          }
          action={
            urlQ ? undefined : (
              <Button asChild>
                <Link href={newHref}>
                  <Plus /> New quote
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="relative -mx-2 overflow-x-auto">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead>
              <tr className="text-left text-[12.5px] text-text-muted">
                <th className="px-3 py-2.5 font-medium">Quote</th>
                {showCustomer && <th className="px-3 py-2.5 font-medium">Customer</th>}
                <th className="px-3 py-2.5 font-medium">Job</th>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/quotes/${r.id}`)}
                  className="cursor-pointer border-t border-divider hover:bg-surface-muted/60"
                >
                  <td className="px-3 py-3.5 font-semibold">
                    <Link
                      href={`/quotes/${r.id}`}
                      className="outline-none focus-visible:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Q-{r.number}
                    </Link>
                  </td>
                  {showCustomer && (
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2.5 font-medium">
                        <InitialsAvatar
                          name={r.customerName}
                          size="sm"
                          className="size-[30px] text-[10px]"
                        />
                        {r.customerName}
                      </span>
                    </td>
                  )}
                  <td className="max-w-[260px] truncate px-3 py-3 text-text-muted">
                    {r.title ?? r.jobTitle ?? "—"}
                  </td>
                  <td className="tabular px-3 py-3 whitespace-nowrap">{formatDay(r.date)}</td>
                  <td className="tabular px-3 py-3 text-right font-semibold">
                    {formatMoney(r.total, currency)}
                  </td>
                  <td className="px-3 py-3">
                    <QuoteStatusPill status={r.status} />
                  </td>
                  <td className="px-3 py-3">
                    <PaymentPill status={r.payment} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
