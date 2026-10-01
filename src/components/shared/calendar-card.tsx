"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { addMonths, format, getDaysInMonth, parseISO } from "date-fns"
import { cn } from "cn"
import { TONE_CLASSES, type Tone } from "@/lib/status"

export type CalendarEvent = { day: string; tone: Tone; label: string }

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// When several jobs share a day, the most urgent colour wins.
const TONE_PRIORITY: Tone[] = [
  "blush",
  "peach",
  "sky",
  "lavender",
  "neutral",
  "mint",
  "ink",
  "white",
]

/** Build the Mon-first grid for a "YYYY-MM" month: leading blanks then day numbers. */
export function monthGrid(month: string): (string | null)[] {
  const first = parseISO(`${month}-01`)
  const lead = (first.getDay() + 6) % 7
  const days = getDaysInMonth(first)
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`)
  return cells
}

/**
 * Month grid of rounded day cells. Days with jobs get a chip coloured by stage, today is
 * outlined, the selected day is ink. Uncontrolled month unless `month` + `onMonthChange` are given.
 */
export function CalendarCard({
  title = "Calendar",
  today,
  initialMonth,
  month: controlledMonth,
  onMonthChange,
  events,
  selectedDay,
  onSelectDay,
  legend,
  footer,
  menu,
  className,
}: {
  title?: string
  today: string
  initialMonth?: string
  month?: string
  onMonthChange?: (month: string) => void
  events: CalendarEvent[]
  selectedDay?: string | null
  onSelectDay?: (day: string) => void
  legend?: { tone: Tone; label: string }[]
  footer?: React.ReactNode
  menu?: React.ReactNode
  className?: string
}) {
  const [innerMonth, setInnerMonth] = useState(initialMonth ?? today.slice(0, 7))
  const month = controlledMonth ?? innerMonth
  const setMonth = (m: string) => (onMonthChange ? onMonthChange(m) : setInnerMonth(m))

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) map.set(e.day, [...(map.get(e.day) ?? []), e])
    return map
  }, [events])

  const cells = monthGrid(month)
  const step = (n: number) => setMonth(format(addMonths(parseISO(`${month}-01`), n), "yyyy-MM"))

  return (
    <section className={cn("min-w-0 rounded-card bg-surface p-5", className)}>
      <header className="mb-2 flex min-h-8 items-center justify-between">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-text">
          {title}
          <CalendarDays className="size-4" aria-hidden />
        </h2>
        {menu}
      </header>

      <div className="mb-3 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous month"
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-text-muted outline-none hover:bg-surface-muted hover:text-text focus-visible:ring-2 focus-visible:ring-ink"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="min-w-36 text-center text-[15px] font-semibold text-text" aria-live="polite">
          {format(parseISO(`${month}-01`), "MMMM yyyy")}
        </p>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next month"
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-text-muted outline-none hover:bg-surface-muted hover:text-text focus-visible:ring-2 focus-visible:ring-ink"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div role="grid" aria-label={format(parseISO(`${month}-01`), "MMMM yyyy")}>
        <div role="row" className="grid grid-cols-7 gap-1.5 pb-2">
          {WEEKDAYS.map((d) => (
            <span key={d} role="columnheader" className="text-center text-[12px] text-text-muted">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (!day) return <span key={`blank-${i}`} aria-hidden />
            const dayEvents = byDay.get(day) ?? []
            const top = [...dayEvents].sort(
              (a, b) => TONE_PRIORITY.indexOf(a.tone) - TONE_PRIORITY.indexOf(b.tone)
            )[0]
            const isToday = day === today
            const isSelected = day === selectedDay
            const label = `${format(parseISO(day), "EEEE, MMMM d")}${
              dayEvents.length ? `: ${dayEvents.map((e) => e.label).join(", ")}` : ""
            }${isToday ? " (today)" : ""}`
            return (
              <button
                key={day}
                type="button"
                role="gridcell"
                aria-label={label}
                aria-selected={isSelected}
                onClick={() => onSelectDay?.(day)}
                className={cn(
                  "tabular flex h-[31px] cursor-pointer items-center justify-center rounded-[10px] text-[12.5px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1",
                  isSelected
                    ? "bg-ink text-ink-foreground"
                    : top
                      ? TONE_CLASSES[top.tone].chip
                      : "bg-surface-muted text-text-muted hover:bg-divider",
                  isToday && !isSelected && "ring-2 ring-ink ring-inset"
                )}
              >
                {Number(day.slice(8))}
              </button>
            )
          })}
        </div>
      </div>

      {legend && legend.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5 text-[12px] text-text-muted">
              <span className={cn("size-1.5 rounded-full", TONE_CLASSES[l.tone].dot)} aria-hidden />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {footer}
    </section>
  )
}
