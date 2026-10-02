"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Check, Loader2, Plus, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FilterPill } from "@/components/shell/breadcrumb"
import { CUSTOMER_FILTERS, CUSTOMER_FILTER_LABEL, type CustomerFilter } from "../constants"

const FILTER_DOT: Record<CustomerFilter, string> = {
  all: "bg-text-subtle",
  active: "bg-peach-bar",
  none: "bg-slate",
  owes: "bg-blush-bar",
}

/** Breadcrumb tools: debounced search (URL ?q=), filter pill (URL ?filter=), + Customer. */
export function CustomersToolbar({ onNew }: { onNew: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const [q, setQ] = useState(params.get("q") ?? "")
  const filter = (params.get("filter") as CustomerFilter) ?? "all"

  const push = (next: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v)
      else sp.delete(k)
    }
    const qs = sp.toString()
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const urlQ = params.get("q") ?? ""
  useEffect(() => {
    // Only touch the URL when the text really changed; a stray replace() could otherwise
    // land after the user has already navigated away.
    if (q.trim() === urlQ) return
    const t = setTimeout(() => push({ q: q.trim() || null }), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on text only
  }, [q])

  return (
    <>
      <label className="relative flex h-9 w-full items-center sm:w-[280px]">
        <span className="sr-only">Search customers</span>
        {pending ? (
          <Loader2 className="pointer-events-none absolute left-3 size-4 animate-spin text-text-muted" />
        ) : (
          <Search className="pointer-events-none absolute left-3 size-4 text-text-muted" />
        )}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone or address"
          className="h-9 w-full rounded-full bg-surface pr-9 pl-9 text-[13px] text-text outline-none placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ink [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-2 inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-text-muted hover:bg-surface-muted"
          >
            <X className="size-3.5" />
          </button>
        )}
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <FilterPill
            dotClassName={FILTER_DOT[filter]}
            aria-label={`Filter: ${CUSTOMER_FILTER_LABEL[filter]}`}
          >
            {filter === "all" ? "All customers" : CUSTOMER_FILTER_LABEL[filter]}
          </FilterPill>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {CUSTOMER_FILTERS.map((f) => (
            <DropdownMenuItem key={f} onSelect={() => push({ filter: f === "all" ? null : f })}>
              <span className={`size-2 rounded-full ${FILTER_DOT[f]}`} />
              {CUSTOMER_FILTER_LABEL[f]}
              {f === filter && <Check className="ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button onClick={onNew}>
        <Plus /> Customer
      </Button>
    </>
  )
}
