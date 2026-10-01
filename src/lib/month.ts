import { addMonths, format, parseISO } from "date-fns"

export type Month = string // "2026-09"

export function monthLabel(month: Month | null): string {
  return month ? format(parseISO(`${month}-01`), "MMMM yyyy") : "All time"
}

/** Read ?month= consistently on the server: "all" -> null, invalid/missing -> fallback. */
export function parseMonthParam(value: unknown, fallback: Month | null): Month | null {
  if (value === "all") return null
  if (typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value
  return fallback
}

/** [first day, first day of next month) as "YYYY-MM-DD" strings. */
export function monthRange(month: Month): { start: string; end: string } {
  const start = parseISO(`${month}-01`)
  return { start: format(start, "yyyy-MM-dd"), end: format(addMonths(start, 1), "yyyy-MM-dd") }
}

export function shiftMonth(month: Month, n: number): Month {
  return format(addMonths(parseISO(`${month}-01`), n), "yyyy-MM")
}
