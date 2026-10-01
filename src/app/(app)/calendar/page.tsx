import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { dayInZone } from "@/lib/dates"
import { parseMonthParam } from "@/lib/month"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { dashboardJobs, jobsView } from "@/features/dashboard/queries"
import { JobsCalendar } from "@/features/dashboard/components/jobs-calendar"

export const metadata: Metadata = { title: "Calendar" }

/** Rail > Calendar (D11): every job on a large month grid; tap a day for its jobs. */
export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const user = await requireUser()
  const sp = await searchParams
  const now = new Date()
  const thisMonth = dayInZone(now, user.timezone).slice(0, 7)
  const month = parseMonthParam(sp.month, thisMonth) ?? thisMonth
  const data = await dashboardJobs(user.businessId, user.timezone, now)
  const view = jobsView(data, { filter: "all", month })
  return (
    <>
      <Breadcrumb title="Calendar" backHref="/" />
      <div className="mx-auto max-w-[760px]">
        <JobsCalendar
          title="All jobs"
          today={data.today}
          month={month}
          events={view.events}
          byDay={view.byDay}
          className="[&_[role=gridcell]]:h-14 [&_[role=gridcell]]:text-[14px]"
        />
      </div>
    </>
  )
}
