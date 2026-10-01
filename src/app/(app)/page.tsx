import type { Metadata } from "next"
import { Suspense } from "react"
import { requireUser, type CurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { dayInZone } from "@/lib/dates"
import { parseMonthParam } from "@/lib/month"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { InboxCard } from "@/components/shared/inbox-card"
import { MonthPicker } from "@/components/shared/month-picker"
import { Skeleton } from "@/components/ui/skeleton"
import { latestActivity } from "@/features/activity/queries"
import { booksSummary } from "@/features/books/queries"
import { latestPhotos } from "@/features/photos/queries"
import {
  dashboardJobs,
  ensureJobReminders,
  jobsView,
  moneyByMonth,
  openQuotes,
  parseJobsFilter,
  pipelineView,
  type DashboardFilter,
} from "@/features/dashboard/queries"
import { DashboardJobsFilter } from "@/features/dashboard/components/jobs-filter"
import { JobsCalendar } from "@/features/dashboard/components/jobs-calendar"
import { LatestPhotos } from "@/features/dashboard/components/latest-photos"
import { MoneyChart } from "@/features/dashboard/components/money-chart"
import { MonthCard } from "@/features/dashboard/components/month-card"
import { OngoingStrip } from "@/features/dashboard/components/ongoing-strip"
import { OwnerCard } from "@/features/dashboard/components/owner-card"
import { PipelineBoard } from "@/features/dashboard/components/pipeline-board"

export const metadata: Metadata = { title: "Home" }

function greeting(timeZone: string, now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now)
  )
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

type Ctx = {
  user: CurrentUser
  now: Date
  month: string
  thisMonth: string
  filter: DashboardFilter
}

/** Dashboard (shot-dashboard.png): "what needs me today". Each card streams on its own. */
export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser()
  const sp = await searchParams
  const now = new Date()
  const thisMonth = dayInZone(now, user.timezone).slice(0, 7)
  const ctx: Ctx = {
    user,
    now,
    thisMonth,
    month: parseMonthParam(sp.month, thisMonth) ?? thisMonth,
    filter: parseJobsFilter(sp.jobs),
  }
  const business = await db.business.findUniqueOrThrow({
    where: { id: user.businessId },
    select: { name: true },
  })
  // D4: tomorrow's job reminders are created on load, before the activity card reads them.
  await ensureJobReminders(user.businessId, user.timezone, now).catch((e) =>
    console.error("job reminders failed", e instanceof Error ? e.message : e)
  )

  return (
    <>
      <Breadcrumb title={`${greeting(user.timezone, now)}, ${business.name}`}>
        <DashboardJobsFilter current={ctx.filter} />
        <MonthPicker current={ctx.month} defaultMonth={thisMonth} />
      </Breadcrumb>

      <div className="grid gap-4 md:gap-[18px]">
        <div className="grid gap-4 md:gap-[18px] lg:grid-cols-[380px_minmax(0,1fr)]">
          <Suspense fallback={<CardSkeleton className="h-[218px]" />}>
            <OwnerSection ctx={ctx} businessName={business.name} />
          </Suspense>
          <Suspense fallback={<CardSkeleton className="h-[218px]" />}>
            <StripSection ctx={ctx} />
          </Suspense>
        </div>

        <div className="grid gap-4 md:gap-[18px] lg:grid-cols-2 xl:grid-cols-[380px_minmax(0,1fr)_minmax(0,1fr)]">
          <Suspense fallback={<CardSkeleton className="h-[390px]" />}>
            <MonthSection ctx={ctx} />
          </Suspense>
          <Suspense fallback={<CardSkeleton className="h-[390px]" />}>
            <CalendarSection ctx={ctx} />
          </Suspense>
          <Suspense fallback={<CardSkeleton className="h-[390px] lg:col-span-2 xl:col-span-1" />}>
            <ActivitySection ctx={ctx} />
          </Suspense>
        </div>

        <Suspense fallback={<CardSkeleton className="h-[260px]" />}>
          <PipelineSection ctx={ctx} />
        </Suspense>

        <div className="grid gap-4 md:gap-[18px] lg:grid-cols-2">
          <Suspense fallback={<CardSkeleton className="h-[300px]" />}>
            <ChartSection ctx={ctx} />
          </Suspense>
          <Suspense fallback={<CardSkeleton className="h-[300px]" />}>
            <PhotosSection ctx={ctx} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={`w-full rounded-card bg-surface/70 ${className ?? ""}`} />
}

async function OwnerSection({ ctx, businessName }: { ctx: Ctx; businessName: string }) {
  const data = await dashboardJobs(ctx.user.businessId, ctx.user.timezone, ctx.now)
  const view = jobsView(data, { filter: ctx.filter, month: ctx.month })
  return (
    <OwnerCard
      businessName={businessName}
      avatarColor={ctx.user.avatarColor}
      today={data.today}
      jobsToday={view.jobsToday}
    />
  )
}

async function StripSection({ ctx }: { ctx: Ctx }) {
  const data = await dashboardJobs(ctx.user.businessId, ctx.user.timezone, ctx.now)
  const view = jobsView(data, { filter: ctx.filter, month: ctx.month })
  return <OngoingStrip jobs={view.ongoing} hasAnyJobs={view.total > 0} />
}

async function MonthSection({ ctx }: { ctx: Ctx }) {
  const { businessId, timezone, currency } = ctx.user
  const [summary, quotes, data] = await Promise.all([
    booksSummary(businessId, { month: ctx.month }),
    openQuotes(businessId),
    dashboardJobs(businessId, timezone, ctx.now),
  ])
  const view = jobsView(data, { filter: ctx.filter, month: ctx.month })
  return (
    <MonthCard
      month={ctx.month}
      isThisMonth={ctx.month === ctx.thisMonth}
      currency={currency}
      revenue={summary.revenue}
      expenses={summary.expenses}
      net={summary.net}
      margin={summary.margin}
      openQuotes={quotes}
      activeJobs={view.active}
      scheduledJobs={view.scheduled}
    />
  )
}

async function CalendarSection({ ctx }: { ctx: Ctx }) {
  const data = await dashboardJobs(ctx.user.businessId, ctx.user.timezone, ctx.now)
  const view = jobsView(data, { filter: ctx.filter, month: ctx.month })
  return (
    <JobsCalendar today={data.today} month={ctx.month} events={view.events} byDay={view.byDay} />
  )
}

async function ActivitySection({ ctx }: { ctx: Ctx }) {
  const { items } = await latestActivity(ctx.user.businessId, {
    take: 6,
    timezone: ctx.user.timezone,
    now: ctx.now,
  })
  return (
    <InboxCard
      title="Activity"
      items={items}
      viewAllHref="/activity"
      className="lg:col-span-2 xl:col-span-1"
    />
  )
}

async function PipelineSection({ ctx }: { ctx: Ctx }) {
  const data = await dashboardJobs(ctx.user.businessId, ctx.user.timezone, ctx.now)
  return <PipelineBoard columns={pipelineView(data)} />
}

async function ChartSection({ ctx }: { ctx: Ctx }) {
  const data = await moneyByMonth(ctx.user.businessId, ctx.thisMonth)
  return <MoneyChart data={data} currency={ctx.user.currency} />
}

async function PhotosSection({ ctx }: { ctx: Ctx }) {
  return <LatestPhotos photos={await latestPhotos(ctx.user.businessId, 6)} />
}
