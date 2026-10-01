"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { format, parseISO } from "date-fns"
import { Plus } from "lucide-react"
import { cn } from "cn"
import { CalendarCard, type CalendarEvent } from "@/components/shared/calendar-card"
import { StagePill } from "@/components/shared/status-pill"
import { AvatarStack } from "@/components/shared/initials-avatar"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Tone } from "@/lib/status"
import type { DashboardJob } from "../queries"

export const CALENDAR_LEGEND: { tone: Tone; label: string }[] = [
  { tone: "sky", label: "Scheduled" },
  { tone: "peach", label: "In progress" },
  { tone: "blush", label: "Overdue" },
  { tone: "mint", label: "Completed" },
]

/**
 * Month grid of every job (chips by stage, today outlined). The month (?month=) and the open
 * day (?day=) live in the URL, so "3 jobs today" and shared links open the same sheet.
 */
export function JobsCalendar({
  today,
  month,
  events,
  byDay,
  className,
  title = "Calendar",
}: {
  today: string
  month: string
  events: CalendarEvent[]
  byDay: Record<string, DashboardJob[]>
  className?: string
  title?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, start] = useTransition()
  const day = params.get("day")
  const open = !!day && /^\d{4}-\d{2}-\d{2}$/.test(day)
  const dayJobs = (open && byDay[day!]) || []

  const update = (edit: (sp: URLSearchParams) => void) => {
    const sp = new URLSearchParams(params.toString())
    edit(sp)
    start(() => router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false }))
  }

  return (
    <>
      <CalendarCard
        title={title}
        today={today}
        month={month}
        onMonthChange={(m) => update((sp) => sp.set("month", m))}
        events={events}
        selectedDay={open ? day : null}
        onSelectDay={(d) => update((sp) => sp.set("day", d))}
        legend={CALENDAR_LEGEND}
        className={className}
      />
      <Sheet open={open} onOpenChange={(o) => !o && update((sp) => sp.delete("day"))}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{open ? format(parseISO(day!), "EEEE, MMMM d") : "Day"}</SheetTitle>
            <SheetDescription>
              {dayJobs.length === 0
                ? "Nothing scheduled."
                : `${dayJobs.length} ${dayJobs.length === 1 ? "job" : "jobs"}`}
              {open && day === today ? " · Today" : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2.5 px-4 pb-6">
            {dayJobs.map((j) => (
              <Link
                key={j.id}
                href={j.href}
                className={cn(
                  "block rounded-field bg-surface-muted p-3.5 outline-none hover:bg-divider focus-visible:ring-2 focus-visible:ring-ink"
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold">{j.title}</span>
                    <span className="block truncate text-[12.5px] text-text-muted">
                      {j.customerName}
                      {j.whenLabel ? ` · ${j.whenLabel.split(" · ")[1]}` : ""}
                    </span>
                  </span>
                  <StagePill stage={j.stage} overdue={j.overdue} />
                </span>
                {j.assignees.length > 0 && (
                  <span className="mt-2.5 block">
                    <AvatarStack people={j.assignees} showAdd={false} />
                  </span>
                )}
              </Link>
            ))}
            <Button variant="secondary" className="mt-1 w-fit bg-surface-muted" asChild>
              <Link href="/customers?new=job">
                <Plus /> New job
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
