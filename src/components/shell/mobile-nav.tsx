"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { LogOut, Menu } from "lucide-react"
import { cn } from "cn"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { signOutAction } from "@/features/auth/actions"
import { MAIN_NAV, RAIL_NAV, isActive } from "./nav-items"
import { NEW_ITEMS } from "./header-tools"

/** The More sheet: every rail destination plus the + New actions (phones and the menu button). */
export function MoreSheet({
  trigger,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const pathname = usePathname()
  const [innerOpen, setInnerOpen] = useState(false)
  const isOpen = open ?? innerOpen
  const setOpen = onOpenChange ?? setInnerOpen
  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-[22px] pb-[max(16px,env(safe-area-inset-bottom))]"
      >
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-2 px-4">
          {RAIL_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-[16px] px-2 py-3 text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink",
                isActive(href, pathname)
                  ? "bg-ink text-ink-foreground"
                  : "bg-surface-muted text-text"
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
        <p className="px-4 pt-4 pb-1 text-[12px] font-medium text-text-muted">Create</p>
        <div className="grid grid-cols-2 gap-2 px-4">
          {NEW_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-full bg-surface-muted px-3.5 py-2.5 text-[13px] font-semibold text-text outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          ))}
        </div>
        <form action={signOutAction} className="px-4 pt-4">
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-blush px-4 py-2.5 text-[13px] font-semibold text-blush-ink"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/** Below 768px the pill nav becomes this bottom tab bar (Home, Customers, Quotes, Books, More). */
export function MobileTabBar() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const inMain = MAIN_NAV.some((n) => isActive(n.href, pathname))
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {MAIN_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active ? "bg-ink text-ink-foreground" : "text-text-muted"
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <span className={active ? "text-text" : "text-text-muted"}>{label}</span>
              </Link>
            </li>
          )
        })}
        <li className="flex-1">
          <MoreSheet
            open={moreOpen}
            onOpenChange={setMoreOpen}
            trigger={
              <button
                type="button"
                className="flex w-full cursor-pointer flex-col items-center gap-1 py-2 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full",
                    !inMain ? "bg-ink text-ink-foreground" : "text-text-muted"
                  )}
                >
                  <Menu className="size-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <span className={!inMain ? "text-text" : "text-text-muted"}>More</span>
              </button>
            }
          />
        </li>
      </ul>
    </nav>
  )
}
