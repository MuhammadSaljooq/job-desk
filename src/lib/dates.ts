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

/** Offset (minutes east of UTC) of a timezone at a given instant, via Intl (no extra deps). */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  )
  return Math.round((asUtc - instant.getTime()) / 60000)
}

/**
 * The instant for a wall-clock time on a day in a timezone:
 * zonedInstant("2026-10-02", "09:00", "America/New_York") -> 2026-10-02T13:00:00Z.
 */
export function zonedInstant(day: Day, time: string, timeZone: string): Date {
  const [h, m] = time.split(":").map(Number)
  const [y, mo, d] = day.split("-").map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, m)
  // Two passes handle the hour around DST changes.
  let instant = guess - zoneOffsetMinutes(new Date(guess), timeZone) * 60000
  instant = guess - zoneOffsetMinutes(new Date(instant), timeZone) * 60000
  return new Date(instant)
}

/** Wall-clock "HH:mm" of an instant in a timezone. */
export function timeInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant)
}

/**
 * Postgres DATE columns (Quote.date, Transaction.date) hold the business-local day as UTC
 * midnight. These two convert between that Date and a Day string.
 */
export function dayToDbDate(day: Day): Date {
  return new Date(`${day}T00:00:00.000Z`)
}
export function dbDateToDay(date: Date): Day {
  return date.toISOString().slice(0, 10)
}
