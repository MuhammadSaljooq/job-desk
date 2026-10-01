"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RAIL_NAV, isActive } from "./nav-items"

/** Floating dark vertical capsule on the left, vertically centred (desktop only). */
export function IconRail() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Tools"
      className="fixed top-1/2 left-6 z-30 hidden -translate-y-1/2 flex-col items-center gap-3 rounded-full bg-rail px-2 py-4 lg:flex"
    >
      {RAIL_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname)
        return (
          <Tooltip key={href}>
            <TooltipTrigger asChild>
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex size-[42px] items-center justify-center rounded-full text-rail-foreground transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/70",
                  active && "bg-rail-active text-white"
                )}
              >
                <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        )
      })}
    </nav>
  )
}
