"use client"

import Link from "next/link"
import { useState } from "react"
import { cn } from "cn"
import { LayoutGrid, Menu } from "lucide-react"
import type { InboxItem } from "@/components/shared/inbox-card"
import { IconRail } from "./icon-rail"
import { PillNav } from "./pill-nav"
import { AvatarMenu, NewMenu, NotificationsButton, SearchButton } from "./header-tools"
import { MobileTabBar, MoreSheet } from "./mobile-nav"
import { CommandSearch } from "./command-search"

export type ShellUser = {
  name: string
  email: string
  avatarColor: string
  roleLabel: string
}

const roundWhite =
  "inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-surface text-text outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink [&_svg]:size-[18px]"

/**
 * The frame every signed-in page uses (docs/screens): top bar with the pill nav, header
 * tools and avatar; floating dark icon rail; bottom tab bar on phones.
 */
export function AppShell({
  user,
  notifications,
  unread,
  children,
}: {
  user: ShellUser
  notifications: InboxItem[]
  unread: number
  children: React.ReactNode
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-ink-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <header className="relative z-20 mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 pt-4 md:px-6 md:pt-5">
        {/* left: menu + jump to (desktop/tablet); logo on phones */}
        <div className="flex items-center gap-3">
          <MoreSheet
            open={menuOpen}
            onOpenChange={setMenuOpen}
            trigger={
              <button
                type="button"
                aria-label="Menu"
                className={cn(roundWhite, "hidden md:inline-flex")}
              >
                <Menu strokeWidth={1.75} />
              </button>
            }
          />
          <button
            type="button"
            aria-label="Jump to (⌘K)"
            onClick={() => setSearchOpen(true)}
            className={cn(roundWhite, "hidden md:inline-flex")}
          >
            <LayoutGrid strokeWidth={1.75} />
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink md:hidden"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-ink-foreground">
              JD
            </span>
            <span className="text-[16px] font-bold tracking-tight">JobDesk</span>
          </Link>
        </div>

        <div className="hidden min-w-0 md:block lg:absolute lg:left-1/2 lg:-translate-x-1/2">
          <PillNav />
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center rounded-full bg-surface px-1">
            <NewMenu className="hidden md:inline-flex" />
            <NotificationsButton unread={unread} items={notifications} />
            <SearchButton onOpen={() => setSearchOpen(true)} />
          </div>
          <AvatarMenu
            name={user.name}
            email={user.email}
            color={user.avatarColor}
            roleLabel={user.roleLabel}
          />
        </div>
      </header>

      <IconRail />

      <main
        id="main"
        className="mx-auto max-w-[1440px] px-4 pt-5 pb-28 md:px-6 md:pt-[26px] md:pb-16 lg:pl-[102px]"
      >
        {children}
      </main>

      <MobileTabBar />
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
