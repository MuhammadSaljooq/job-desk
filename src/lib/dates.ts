// Day arithmetic on "YYYY-MM-DD" strings in the business timezone (decision D13).
// Working with plain day strings keeps "today", overdue and the calendar free of
// UTC-vs-local drift: convert an instant to a day once, at the edge, with dayInZone().

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"

export type Day = string // "2026-09-29"

/** The calendar day an instant falls on in a timezone, e.g. dayInZone(now, "America/New_York"). */
export function dayInZone(instant: Date, timeZone: string): Day {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant)
}

export function shiftDay(day: Day, days: number): Day {
  return format(addDays(parseISO(day), days), "yyyy-MM-dd")
}

export function daysBetween(from: Day, to: Day): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from))
}

/** "Sep 29, 2026" */
export function formatDay(day: Day): string {
  return format(parseISO(day), "MMM d, yyyy")
}

/** "Sep 29" */
export function formatDayShort(day: Day): string {
  return format(parseISO(day), "MMM d")
}

/**
 * The white chip on a job card: "Today", "3 days left", "2 days late", "Done", "Awaiting reply".
 * Lead and Quoted jobs are waiting on the customer, so they never count down or run late.
 */
export function jobChipLabel(
  stage: "LEAD" | "QUOTED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED",
  scheduledDay: Day | null,
  today: Day
): string {
  if (stage === "COMPLETED") return "Done"
  if (stage === "QUOTED") return "Awaiting reply"
  if (stage === "LEAD") return "New lead"
  if (!scheduledDay) return "Not scheduled"
  const diff = daysBetween(today, scheduledDay)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff > 1) return `${diff} days left`
  return diff === -1 ? "1 day late" : `${-diff} days late`
}
