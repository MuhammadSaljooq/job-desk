import "server-only"
import { db } from "@/lib/db"
import { colorForName } from "@/lib/avatar"
import type { InboxItem } from "@/components/shared/inbox-card"
import { activityHref, relativeTime } from "./format"

const activitySelect = {
  id: true,
  type: true,
  message: true,
  detail: true,
  entity: true,
  entityId: true,
  customerId: true,
  readAt: true,
  createdAt: true,
  customer: { select: { name: true } },
  actor: { select: { name: true, avatarColor: true, role: true } },
} as const

/** Latest activity as inbox rows; the newest unread item is highlighted (black pill). */
export async function latestActivity(
  businessId: string,
  opts: {
    take?: number
    customerId?: string
    timezone: string
    now?: Date
    /** dashboard: the customer it's about; customer profile: who did it (screenshots) */
    avatar?: "customer" | "actor"
    unreadOnly?: boolean
  }
): Promise<{ items: InboxItem[]; unread: number }> {
  const where = { businessId, ...(opts.customerId ? { customerId: opts.customerId } : {}) }
  const [rows, unread] = await Promise.all([
    db.activity.findMany({
      where: opts.unreadOnly ? { ...where, readAt: null } : where,
      select: activitySelect,
      orderBy: { createdAt: "desc" },
      take: opts.take ?? 6,
    }),
    db.activity.count({ where: { ...where, readAt: null } }),
  ])
  const now = opts.now ?? new Date()
  const newestUnread = rows.find((r) => !r.readAt)?.id
  return {
    unread,
    items: rows.map((r) => {
      const actorName = r.actor ? (r.actor.role === "OWNER" ? "Me" : r.actor.name) : null
      const useCustomer = (opts.avatar ?? "customer") === "customer" ? !!r.customer : !actorName
      const person = useCustomer
        ? (r.customer?.name ?? "Customer")
        : (actorName ?? r.customer?.name ?? "JobDesk")
      const color = useCustomer
        ? colorForName(person)
        : (r.actor?.avatarColor ?? colorForName(person))
      return {
        id: r.id,
        avatarName: person,
        avatarColor: color,
        title: r.message,
        preview: r.detail ?? "",
        time: relativeTime(r.createdAt, now, opts.timezone),
        highlighted: r.id === newestUnread,
        href: activityHref(r),
      }
    }),
  }
}
