import "server-only"
import { cache } from "react"
import { dayInZone, formatDayOf, formatWhen, jobChipLabel, timeInZone } from "@/lib/dates"
import { STAGE_META, isOverdue, jobTone } from "@/lib/status"
import type { CalendarEvent } from "@/components/shared/calendar-card"
import type { JobRow } from "@/features/jobs/components/job-list-types"
import type { StripJob } from "./components/jobs-strip"
import { getCustomerProfile, type CustomerProfile } from "./queries"

/** One profile load per request, shared by the layout and the tab pages. */
export const loadProfile = cache((businessId: string, customerId: string) =>
  getCustomerProfile(businessId, customerId)
)

export type JobsFilter = "all" | "active" | "completed"

/** Shape the profile's jobs for the strip, calendar, "next visit" and jobs list. */
export function profileJobsView(
  profile: CustomerProfile,
  opts: { timezone: string; now: Date; filter: JobsFilter }
) {
  const tz = opts.timezone
  const today = dayInZone(opts.now, tz)
  const all = profile.customer.jobs.map((j) => {
    const day = j.scheduledAt ? dayInZone(j.scheduledAt, tz) : null
    return { ...j, day, overdue: isOverdue(j.stage, day, today) }
  })
  const jobs = all.filter((j) =>
    opts.filter === "active"
      ? j.stage !== "COMPLETED"
      : opts.filter === "completed"
        ? j.stage === "COMPLETED"
        : true
  )

  const strip: StripJob[] = jobs.map((j) => ({
    id: j.id,
    dateLabel: j.scheduledAt ? formatDayOf(j.scheduledAt, tz) : "No date",
    title: j.title,
    category: j.category,
    stage: j.stage,
    overdue: j.overdue,
    assignees: j.assignees.map((a) => ({ name: a.name, color: a.avatarColor })),
    chip: jobChipLabel(j.stage, j.day, today),
  }))

  const events: CalendarEvent[] = all
    .filter((j) => j.day)
    .map((j) => ({ day: j.day!, tone: jobTone(j.stage, j.overdue), label: j.title }))
  const jobsByDay: Record<string, string[]> = {}
  for (const j of all) if (j.day) (jobsByDay[j.day] ??= []).push(j.id)

  const upcoming = all
    .filter((j) => j.scheduledAt && j.stage !== "COMPLETED" && j.day! >= today)
    .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime())[0]
  const nextVisit = upcoming
    ? {
        label: formatWhen(upcoming.scheduledAt!, tz, " at "),
        title: upcoming.title,
        tone: STAGE_META[upcoming.stage].tone,
      }
    : null

  const rows: JobRow[] = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    category: j.category,
    stage: j.stage,
    overdue: j.overdue,
    when: j.scheduledAt ? formatWhen(j.scheduledAt, tz) : null,
    date: j.day ?? "",
    time: j.scheduledAt ? timeInZone(j.scheduledAt, tz) : "",
    notes: j.notes,
    photoCount: j._count.photos,
    assignees: j.assignees.map((a) => ({ id: a.id, name: a.name, color: a.avatarColor })),
  }))

  return { today, strip, events, jobsByDay, nextVisit, rows }
}
