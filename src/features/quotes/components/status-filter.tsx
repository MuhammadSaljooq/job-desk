"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FilterPill } from "@/components/shell/breadcrumb"
import type { QuoteFilter } from "../schema"

const OPTIONS: { key: QuoteFilter; label: string; dot: string }[] = [
  { key: "ALL", label: "All statuses", dot: "bg-peach-bar" },
  { key: "DRAFT", label: "Drafts", dot: "bg-slate" },
  { key: "SENT", label: "Sent", dot: "bg-sky-ink" },
  { key: "ACCEPTED", label: "Accepted", dot: "bg-mint-ink" },
  { key: "DECLINED", label: "Declined", dot: "bg-blush-bar" },
]

/** Breadcrumb "● All statuses" pill (URL ?status=). */
export function QuoteStatusFilter({ current }: { current: QuoteFilter }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const opt = OPTIONS.find((o) => o.key === current) ?? OPTIONS[0]
  const set = (key: QuoteFilter) => {
    const sp = new URLSearchParams(params.toString())
    if (key === "ALL") sp.delete("status")
    else sp.set("status", key)
    router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false })
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FilterPill dotClassName={opt.dot} aria-label={`Status: ${opt.label}`}>
          {opt.label}
        </FilterPill>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.key} onSelect={() => set(o.key)}>
            <span className={`size-2 rounded-full ${o.dot}`} />
            {o.label}
            {o.key === current && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
