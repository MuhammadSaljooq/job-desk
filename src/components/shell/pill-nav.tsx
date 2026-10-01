"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"
import { MAIN_NAV, isActive } from "./nav-items"

/** Centered white capsule; the active tab is a black pill (desktop and tablet). */
export function PillNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Main" className="flex items-center gap-1 rounded-full bg-surface p-[5px]">
      {MAIN_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-[35px] items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ink lg:gap-2 lg:px-[18px] lg:text-[14px]",
              active ? "bg-ink text-ink-foreground" : "text-text-muted hover:text-text"
            )}
          >
            <Icon className="size-4" aria-hidden strokeWidth={1.75} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
