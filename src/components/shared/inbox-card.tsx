import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { cn } from "cn"
import { InitialsAvatar } from "./initials-avatar"

export type InboxItem = {
  id: string
  avatarName: string
  avatarColor?: string | null
  title: string
  preview: string
  time: string
  /** the newest unread item turns into the ink panel */
  highlighted?: boolean
  href?: string
}

/** Activity / notes list. The highlighted row is the black pill from the reference. */
export function InboxCard({
  title,
  items,
  viewAllHref,
  composer,
  empty,
  className,
}: {
  title: string
  items: InboxItem[]
  viewAllHref?: string
  composer?: React.ReactNode
  empty?: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-card bg-surface p-5", className)}>
      <header className="mb-3 flex min-h-8 items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-text">
          {title}
          <MessageSquare className="size-4" aria-hidden />
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="rounded-full px-1 text-[12.5px] text-text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ink"
          >
            View all
          </Link>
        )}
      </header>
      {composer}
      {items.length === 0 ? (
        (empty ?? <p className="py-6 text-center text-[13px] text-text-muted">Nothing here yet.</p>)
      ) : (
        <ul className="-mx-1 flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id}>
              <InboxRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function InboxRow({ item }: { item: InboxItem }) {
  const cls = cn(
    "flex items-center gap-3 rounded-[18px] px-3 py-2.5 outline-none",
    item.highlighted ? "bg-ink text-ink-foreground" : "text-text",
    item.href &&
      !item.highlighted &&
      "hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink",
    item.href &&
      item.highlighted &&
      "focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
  )
  const body = (
    <>
      <InitialsAvatar name={item.avatarName} color={item.avatarColor} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{item.title}</span>
        <span
          className={cn(
            "block truncate text-[12.5px]",
            item.highlighted ? "text-ink-foreground/75" : "text-text-muted"
          )}
        >
          {item.preview}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 self-start pt-1 text-[11.5px]",
          item.highlighted ? "text-ink-foreground/75" : "text-text-muted"
        )}
      >
        {item.time}
      </span>
    </>
  )
  return item.href ? (
    <Link href={item.href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
