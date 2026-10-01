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

const OPTIONS = [
  { key: "all", label: "All jobs", dot: "bg-peach-bar" },
  { key: "active", label: "Active jobs", dot: "bg-sky-ink" },
  { key: "completed", label: "Completed", dot: "bg-mint-ink" },
] as const

/** Breadcrumb "● All jobs" pill: filters the strip and the jobs list (URL ?jobs=). */
export function JobsFilterPill({ current }: { current: (typeof OPTIONS)[number]["key"] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const opt = OPTIONS.find((o) => o.key === current) ?? OPTIONS[0]
  const set = (key: string) => {
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
            <span className={`size-2 rounded-full ${o.dot}`} />
            {o.label}
            {o.key === current && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
