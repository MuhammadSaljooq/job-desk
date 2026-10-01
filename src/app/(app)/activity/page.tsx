import type { Metadata } from "next"
import Link from "next/link"
import { cn } from "cn"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { InboxCard } from "@/components/shared/inbox-card"
import { EmptyState } from "@/components/shared/empty-state"
import { latestActivity } from "@/features/activity/queries"
import { MarkAllReadButton } from "@/features/activity/mark-all-read-button"
import { Bell } from "lucide-react"

export const metadata: Metadata = { title: "Activity" }

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
] as const

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  const user = await requireUser()
  const { show } = await searchParams
  const filter = show === "unread" ? "unread" : "all"
  const { items, unread } = await latestActivity(user.businessId, {
    take: 100,
    timezone: user.timezone,
    unreadOnly: filter === "unread",
  })

  return (
    <>
      <Breadcrumb title="Activity">
        <nav aria-label="Filter activity" className="flex gap-1 rounded-full bg-surface p-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/activity" : "/activity?show=unread"}
              aria-current={filter === f.key ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ink",
                filter === f.key ? "bg-ink text-ink-foreground" : "text-text-muted hover:text-text"
              )}
            >
              {f.label}
              {f.key === "unread" && unread > 0 && (
                <span className="text-[11px] opacity-70">{unread}</span>
              )}
            </Link>
          ))}
        </nav>
        {unread > 0 && <MarkAllReadButton />}
      </Breadcrumb>
      <div className="max-w-3xl">
        <InboxCard
          title={filter === "unread" ? "Unread" : "Everything that happened"}
          items={items}
          empty={
            <EmptyState
              icon={<Bell />}
              title={filter === "unread" ? "You're all caught up" : "No activity yet"}
              description="Quotes accepted, photos uploaded and payments recorded show up here."
            />
          }
        />
      </div>
    </>
  )
}
