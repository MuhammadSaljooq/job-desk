import { dayInZone, daysBetween } from "@/lib/dates"

/**
 * Inbox time column like the screenshots: "9:40" today, a weekday within the last week
 * ("Mon"), otherwise "Sep 7".
 */
export function relativeTime(at: Date, now: Date, timeZone: string): string {
  const diff = daysBetween(dayInZone(at, timeZone), dayInZone(now, timeZone))
  if (diff <= 0) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).format(at)
  }
  if (diff < 7) return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(at)
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(at)
}

/** Where tapping an activity row goes. */
export function activityHref(a: {
  entity: string
  entityId: string
  customerId: string | null
}): string {
  switch (a.entity) {
    case "quote":
      return `/quotes/${a.entityId}`
    case "job":
      return a.customerId ? `/customers/${a.customerId}?job=${a.entityId}` : "/"
    case "photo":
      return a.customerId ? `/customers/${a.customerId}/photos` : "/photos"
    case "transaction":
      return a.customerId ? `/customers/${a.customerId}/payments` : "/books"
    case "customer":
      return `/customers/${a.entityId}`
    default:
      return "/activity"
  }
}
