import "server-only"
import { cache } from "react"
import { Prisma } from "@/generated/prisma/client"
import { db } from "@/lib/db"
import {
  dayInZone,
  formatDayOf,
  formatWhen,
  jobChipLabel,
  shiftDay,
  timeInZone,
  zonedInstant,
} from "@/lib/dates"
import { shiftMonth, type Month } from "@/lib/month"
import { JOB_STAGES, isOverdue, jobTone, type JobStage } from "@/lib/status"
import type { CalendarEvent } from "@/components/shared/calendar-card"
import { quoteTotalsFor } from "@/features/quotes/sql"

/** Breadcrumb job filter (page-spec Page 1): All, Pending (not started yet), In progress. */
export type DashboardFilter = "all" | "pending" | "in_progress"

export function parseJobsFilter(value: unknown): DashboardFilter {
  return value === "pending" || value === "in_progress" ? value : "all"
}

const PENDING: JobStage[] = ["LEAD", "QUOTED", "SCHEDULED"]

function matches(filter: DashboardFilter, stage: JobStage) {
  if (filter === "pending") return PENDING.includes(stage)
  if (filter === "in_progress") return stage === "IN_PROGRESS"
  return true
}

export type DashboardJob = {
  id: string
  title: string
  category: string | null
  stage: JobStage
  overdue: boolean
  day: string | null
  time: string | null
  customerId: string
  customerName: string
  assignees: { name: string; color: string | null }[]
  dateLabel: string
  whenLabel: string | null
  chip: string
  href: string
}

/** Every job of the business, shaped once per request for the strip, calendar and board. */
export const dashboardJobs = cache(async (businessId: string, timezone: string, now: Date) => {
  const today = dayInZone(now, timezone)
  const rows = await db.job.findMany({
    where: { businessId },
    select: {
      id: true,
      title: true,
      category: true,
      stage: true,
      scheduledAt: true,
      updatedAt: true,
      customerId: true,
      customer: { select: { name: true } },
      assignees: { select: { name: true, avatarColor: true }, orderBy: { name: "asc" } },
    },
    orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  })
  const jobs: DashboardJob[] = rows.map((j) => {
    const day = j.scheduledAt ? dayInZone(j.scheduledAt, timezone) : null
    return {
      id: j.id,
      title: j.title,
      category: j.category,
      stage: j.stage,
      overdue: isOverdue(j.stage, day, today),
      day,
      time: j.scheduledAt ? timeInZone(j.scheduledAt, timezone) : null,
      customerId: j.customerId,
      customerName: j.customer.name,
      assignees: j.assignees.map((a) => ({ name: a.name, color: a.avatarColor })),
      dateLabel: j.scheduledAt ? formatDayOf(j.scheduledAt, timezone) : "No date",
      whenLabel: j.scheduledAt ? formatWhen(j.scheduledAt, timezone) : null,
      chip: jobChipLabel(j.stage, day, today),
      href: `/customers/${j.customerId}?job=${j.id}#job-${j.id}`,
    }
  })
  return { today, jobs, updatedAt: new Map(rows.map((r) => [r.id, r.updatedAt])) }
})

/** Row 1 and 2 job views for a filter and month. */
export function jobsView(
  data: Awaited<ReturnType<typeof dashboardJobs>>,
  opts: { filter: DashboardFilter; month: Month }
) {
  const { today, jobs } = data
  const filtered = jobs.filter((j) => matches(opts.filter, j.stage))
  // nearest date first; undated leads go last (the query already sorts that way)
  const ongoing = filtered.filter((j) => j.stage !== "COMPLETED")
  const events: CalendarEvent[] = filtered
    .filter((j) => j.day?.startsWith(opts.month))
    .map((j) => ({ day: j.day!, tone: jobTone(j.stage, j.overdue), label: j.title }))
  const byDay: Record<string, DashboardJob[]> = {}
  for (const j of filtered) if (j.day) (byDay[j.day] ??= []).push(j)
  const active = jobs.filter((j) => j.stage !== "COMPLETED")
  return {
    ongoing,
    events,
    byDay,
    jobsToday: jobs.filter((j) => j.day === today && j.stage !== "COMPLETED").length,
    active: active.length,
    scheduled: active.filter((j) => j.stage === "SCHEDULED").length,
    total: jobs.length,
  }
}

/** Row 3 pipeline: every open job by stage, plus the 6 most recently completed. */
export function pipelineView(data: Awaited<ReturnType<typeof dashboardJobs>>) {
  const columns = JOB_STAGES.map((stage) => {
    const all = data.jobs.filter((j) => j.stage === stage)
    const shown =
      stage === "COMPLETED"
        ? [...all]
            .sort(
              (a, b) =>
                (data.updatedAt.get(b.id)?.getTime() ?? 0) -
                (data.updatedAt.get(a.id)?.getTime() ?? 0)
            )
            .slice(0, 6)
        : all
    return { stage, count: all.length, jobs: shown }
  })
  return columns
}

/** Quotes waiting on a reply (status SENT): count and total value, from the SQL totals. */
export async function openQuotes(businessId: string) {
  const rows = (await quoteTotalsFor(businessId)).filter((r) => r.status === "SENT")
  return { count: rows.length, value: rows.reduce((a, r) => a + r.total, 0) }
}

export type MonthMoney = { month: Month; income: number; expenses: number }

/** Money in vs out for the 6 months ending at `last`, summed in SQL per month and type. */
export async function moneyByMonth(businessId: string, last: Month): Promise<MonthMoney[]> {
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(last, i - 5))
  const start = new Date(`${months[0]}-01T00:00:00Z`)
  const end = new Date(`${shiftMonth(last, 1)}-01T00:00:00Z`)
  const rows = await db.$queryRaw<{ month: string; type: "INCOME" | "EXPENSE"; cents: bigint }[]>(
    Prisma.sql`
      SELECT to_char(t.date, 'YYYY-MM') AS month, t.type::text AS type, SUM(t."amountCents")::bigint AS cents
      FROM "Transaction" t
      WHERE t."businessId" = ${businessId} AND t.date >= ${start} AND t.date < ${end}
      GROUP BY 1, 2`
  )
  return months.map((month) => {
    const pick = (type: "INCOME" | "EXPENSE") =>
      Number(rows.find((r) => r.month === month && r.type === type)?.cents ?? 0)
    return { month, income: pick("INCOME"), expenses: pick("EXPENSE") }
  })
}

/**
 * D4: in-app reminders for tomorrow's jobs, created when the dashboard loads (no cron).
 * One per job per day; an advisory lock stops two tabs loading at once from doubling up.
 */
export async function ensureJobReminders(businessId: string, timezone: string, now: Date) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { notifyJobReminders: true },
  })
  if (!business?.notifyJobReminders) return 0
  const today = dayInZone(now, timezone)
  const tomorrow = shiftDay(today, 1)
  const from = zonedInstant(tomorrow, "00:00", timezone)
  const to = zonedInstant(shiftDay(tomorrow, 1), "00:00", timezone)
  const startOfToday = zonedInstant(today, "00:00", timezone)

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`reminders:${businessId}`}))`
    const jobs = await tx.job.findMany({
      where: {
        businessId,
        scheduledAt: { gte: from, lt: to },
        stage: { in: ["SCHEDULED", "IN_PROGRESS"] },
      },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        customerId: true,
        customer: { select: { name: true } },
      },
    })
    if (!jobs.length) return 0
    const done = new Set(
      (
        await tx.activity.findMany({
          where: {
            businessId,
            type: "JOB_REMINDER",
            entityId: { in: jobs.map((j) => j.id) },
            createdAt: { gte: startOfToday },
          },
          select: { entityId: true },
        })
      ).map((a) => a.entityId)
    )
    const todo = jobs.filter((j) => !done.has(j.id))
    if (!todo.length) return 0
    await tx.activity.createMany({
      data: todo.map((j) => ({
        businessId,
        type: "JOB_REMINDER" as const,
        message: "Job tomorrow",
        detail: `${j.title} for ${j.customer.name} at ${formatWhen(j.scheduledAt!, timezone).split(" · ")[1]}`,
        customerId: j.customerId,
        entity: "job",
        entityId: j.id,
      })),
    })
    return todo.length
  })
}
