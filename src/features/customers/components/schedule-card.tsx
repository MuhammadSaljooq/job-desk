"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarCard, type CalendarEvent } from "@/components/shared/calendar-card"
import { StatusPill } from "@/components/shared/status-pill"
import type { Tone } from "@/lib/status"
import { useProfileDialogs } from "./profile-dialogs"

/**
 * This customer's visits for the month (chips by stage). Tapping a day with a job jumps to
 * it in the jobs list; an empty day starts a new job on that date. Month = ?month=.
 */
export function ScheduleCard({
  today,
  month,
  events,
  jobsByDay,
  nextVisit,
}: {
  today: string
  month: string
  events: CalendarEvent[]
  jobsByDay: Record<string, string[]>
  nextVisit: { label: string; title: string; tone: Tone } | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { newJob } = useProfileDialogs()

  const setMonth = (m: string) => {
    const sp = new URLSearchParams(params.toString())
    sp.set("month", m)
    router.replace(`${pathname}?${sp}`, { scroll: false })
  }

  return (
    <CalendarCard
      title="Job schedule"
      today={today}
      month={month}
      onMonthChange={setMonth}
      events={events}
      selectedDay={null}
      onSelectDay={(day) => {
        const ids = jobsByDay[day]
        if (ids?.length) {
          const sp = new URLSearchParams(params.toString())
          sp.set("job", ids[0])
          router.replace(`${pathname}?${sp}#job-${ids[0]}`, { scroll: false })
        } else {
          newJob(day)
        }
      }}
      footer={
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] bg-surface-muted px-4 py-3">
          <div className="min-w-0">
            <p className="field-label">Next visit</p>
            <p className="truncate text-[14px] font-semibold">
              {nextVisit?.label ?? "Nothing scheduled"}
            </p>
          </div>
          {nextVisit && (
            <StatusPill tone={nextVisit.tone} className="max-w-[50%] truncate">
              {nextVisit.title}
            </StatusPill>
          )}
        </div>
      }
    />
  )
}
