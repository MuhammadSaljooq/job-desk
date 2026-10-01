import Link from "next/link"
import { ChevronRight, FileText, Minus, UserPlus, CalendarPlus } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ProfileCard } from "@/components/shared/profile-card"

/** Row 1 left: the business as a profile card with quick actions and today's jobs. */
export function OwnerCard({
  businessName,
  avatarColor,
  today,
  jobsToday,
}: {
  businessName: string
  avatarColor: string | null
  today: string
  jobsToday: number
}) {
  return (
    <ProfileCard
      name={businessName}
      subtitle="Owner dashboard"
      avatarColor={avatarColor}
      actions={[
        { label: "New quote", icon: <FileText />, href: "/quotes/new" },
        { label: "New customer", icon: <UserPlus />, href: "/customers?new=customer" },
        { label: "New job", icon: <CalendarPlus />, href: "/customers?new=job" },
        { label: "Log expense", icon: <Minus />, href: "/books?new=expense" },
      ]}
      sinceLabel="Today"
      sinceValue={format(parseISO(today), "EEE, MMM d")}
      status={
        <Link
          href={`/?day=${today}`}
          scroll={false}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-surface-muted pr-1.5 pl-3.5 text-[13px] font-semibold text-text outline-none hover:bg-divider focus-visible:ring-2 focus-visible:ring-ink"
        >
          {jobsToday} {jobsToday === 1 ? "job" : "jobs"} today
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-ink text-ink-foreground">
            <ChevronRight className="size-3.5" aria-hidden />
          </span>
        </Link>
      }
    />
  )
}
