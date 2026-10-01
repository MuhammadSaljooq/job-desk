"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

/** Route tabs under the profile: Jobs | Job site photos | Quotes | Payments. */
export function CustomerTabs({
  customerId,
  counts,
}: {
  customerId: string
  counts: { jobs: number; photos: number; quotes: number; payments: number }
}) {
  const pathname = usePathname()
  const base = `/customers/${customerId}`
  const tabs = [
    { href: base, label: "Jobs", count: counts.jobs },
    { href: `${base}/photos`, label: "Job site photos", count: counts.photos },
    { href: `${base}/quotes`, label: "Quotes", count: counts.quotes },
    { href: `${base}/payments`, label: "Payments", count: counts.payments },
  ]
  return (
    <nav
      aria-label="Customer sections"
      className="scroll-strip max-w-full gap-1! rounded-full bg-surface p-1"
    >
      {tabs.map((t) => {
        const active = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ink",
              active
                ? "bg-ink font-semibold text-ink-foreground"
                : "font-medium text-text hover:bg-surface-muted"
            )}
          >
            {t.label} <span className="text-[11px] opacity-60">{t.count}</span>
          </Link>
        )
      })}
    </nav>
  )
}
