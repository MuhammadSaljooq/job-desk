"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { monthLabel } from "@/lib/month"
import { cn } from "cn"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/**
 * White breadcrumb pill "September 2026 📅" that opens a month grid. The value lives in the
 * URL (?month=YYYY-MM) so it survives reloads and can be shared. `allowAll` adds "All time".
 */
export function MonthPicker({
  param = "month",
  current,
  defaultMonth,
  allowAll = false,
}: {
  param?: string
  /** the month the page is showing (null = all time) */
  current: string | null
  /** shown when nothing is selected yet, e.g. this month */
  defaultMonth: string
  allowAll?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(Number((current ?? defaultMonth).slice(0, 4)))
  const [pending, start] = useTransition()

  const choose = (value: string | null) => {
    const sp = new URLSearchParams(params.toString())
    // "this month" is the default: keep the URL clean
    if (value === defaultMonth && !allowAll) sp.delete(param)
    else if (value === null) sp.set(param, "all")
    else sp.set(param, value)
    setOpen(false)
    start(() => router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false }))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-semibold text-text outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink",
          pending && "opacity-70"
        )}
        aria-label={`Period: ${monthLabel(current)}`}
      >
        {monthLabel(current)}
        <CalendarDays className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            aria-label="Previous year"
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-surface-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-[14px] font-semibold">{year}</span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            aria-label="Next year"
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-surface-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_NAMES.map((m, i) => {
            const value = `${year}-${String(i + 1).padStart(2, "0")}`
            const selected = value === current
            return (
              <button
                key={m}
                type="button"
                onClick={() => choose(value)}
                aria-pressed={selected}
                className={cn(
                  "h-9 cursor-pointer rounded-[10px] text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink",
                  selected
                    ? "bg-ink text-ink-foreground"
                    : value === defaultMonth
                      ? "bg-surface-muted text-text ring-1 ring-ink/40 ring-inset"
                      : "bg-surface-muted text-text hover:bg-divider"
                )}
              >
                {m}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => choose(defaultMonth)}
            className="h-8 flex-1 cursor-pointer rounded-full bg-surface-muted text-[12px] font-semibold hover:bg-divider"
          >
            This month
          </button>
          {allowAll && (
            <button
              type="button"
              onClick={() => choose(null)}
              aria-pressed={current === null}
              className={cn(
                "h-8 flex-1 cursor-pointer rounded-full text-[12px] font-semibold",
                current === null
                  ? "bg-ink text-ink-foreground"
                  : "bg-surface-muted hover:bg-divider"
              )}
            >
              All time
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
