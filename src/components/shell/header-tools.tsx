"use client"

import Link from "next/link"
import { useTransition } from "react"
import {
  Bell,
  Camera,
  CreditCard,
  FileText,
  LogOut,
  Minus,
  Plus,
  Search,
  Settings,
  UserPlus,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import type { InboxItem } from "@/components/shared/inbox-card"
import { signOutAction } from "@/features/auth/actions"
import { markAllActivityReadAction } from "@/features/activity/actions"

export const NEW_ITEMS = [
  { href: "/customers?new=customer", label: "New customer", icon: UserPlus },
  { href: "/customers?new=job", label: "New job", icon: Wrench },
  { href: "/quotes/new", label: "New quote", icon: FileText },
  { href: "/photos?upload=1", label: "Upload photos", icon: Camera },
  { href: "/books?new=expense", label: "Log expense", icon: Minus },
  { href: "/books?new=income", label: "Record payment", icon: CreditCard },
] as const

const toolBtn =
  "inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-text outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink [&_svg]:size-[18px]"

export function NewMenu({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="New" className={cn(toolBtn, className)}>
        <Plus strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        {NEW_ITEMS.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>
              <Icon /> {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function NotificationsButton({
  unread,
  items,
  className,
}: {
  unread: number
  items: InboxItem[]
  className?: string
}) {
  const [pending, start] = useTransition()
  return (
    <Popover>
      <PopoverTrigger
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className={cn(toolBtn, "relative", className)}
      >
        <Bell strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute top-[9px] right-[10px] size-2 rounded-full bg-danger ring-2 ring-surface" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(360px,calc(100vw-24px))] p-2">
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <p className="text-[14px] font-semibold">Notifications</p>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await markAllActivityReadAction()
                    if (!res.ok) toast.error(res.error)
                  })
                }
                className="cursor-pointer text-[12px] text-text-muted hover:text-text"
              >
                Mark all read
              </button>
            )}
            <Link href="/activity" className="text-[12px] text-text-muted hover:text-text">
              View all
            </Link>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-text-muted">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href ?? "/activity"}
                  className="flex items-center gap-3 rounded-[14px] px-2 py-2 outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink"
                >
                  <InitialsAvatar name={n.avatarName} color={n.avatarColor} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{n.title}</span>
                    <span className="block truncate text-[12px] text-text-muted">{n.preview}</span>
                  </span>
                  <span className="shrink-0 self-start pt-0.5 text-[11px] text-text-muted">
                    {n.time}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function SearchButton({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search (⌘K)"
      title="Search (⌘K)"
      className={cn(toolBtn, className)}
    >
      <Search strokeWidth={1.75} />
    </button>
  )
}

export function AvatarMenu({
  name,
  email,
  color,
  roleLabel,
}: {
  name: string
  email: string
  color: string
  roleLabel: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
      >
        <InitialsAvatar
          name={roleLabel === "Owner" ? "Me" : name}
          color={color}
          size="md"
          className="size-[42px]"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate text-[13px] font-semibold text-text">{name}</span>
          <span className="truncate text-[12px] font-normal text-text-muted">
            {roleLabel} · {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/change-password">
            <Settings /> Change password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
