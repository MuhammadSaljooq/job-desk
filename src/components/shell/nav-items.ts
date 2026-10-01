import {
  BarChart3,
  Bell,
  Box,
  CalendarDays,
  Camera,
  FileText,
  Home,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"

export type NavItem = { href: string; label: string; icon: LucideIcon }

/** Centre pill nav (desktop) and bottom tab bar (mobile). */
export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/books", label: "Books", icon: BarChart3 },
]

/** Dark icon rail (desktop) and the More sheet (mobile). */
export const RAIL_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/activity", label: "Activity", icon: Bell },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/catalog", label: "Item catalog", icon: Box },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/photos", label: "Photos", icon: Camera },
  { href: "/settings", label: "Settings", icon: Settings },
]

/** Which top-level section a path belongs to ("/customers/abc/photos" -> "/customers"). */
export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}
