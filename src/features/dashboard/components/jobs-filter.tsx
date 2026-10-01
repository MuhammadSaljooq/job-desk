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
import type { DashboardFilter } from "../queries"

const OPTIONS: { key: DashboardFilter; label: string; dot: string }[] = [
  { key: "all", label: "All jobs", dot: "bg-text-muted" },
  { key: "pending", label: "Pending", dot: "bg-sky-ink" },
  { key: "in_progress", label: "In progress", dot: "bg-peach-bar" },
]

/** Breadcrumb "● In progress" pill on the dashboard (?jobs=): drives rows 1 and 2. */
export function DashboardJobsFilter({ current }: { current: DashboardFilter }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const opt = OPTIONS.find((o) => o.key === current) ?? OPTIONS[0]
  const set = (key: DashboardFilter) => {
    const sp = new URLSearchParams(params.toString())
    if (key === "all") sp.delete("jobs")
    else sp.set("jobs", key)
    router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false })
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FilterPill dotClassName={opt.dot} aria-label={`Show: ${opt.label}`}>
          {opt.label}
        </FilterPill>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.key} onSelect={() => set(o.key)}>
            <span className={`size-1.5 rounded-full ${o.dot}`} aria-hidden />
            {o.label}
            {o.key === current && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
