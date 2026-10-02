import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { AppShell } from "@/components/shell/app-shell"
import { latestActivity } from "@/features/activity/queries"
import { ThemeSync } from "@/features/settings/components/theme-sync"

/** Every signed-in page: auth check, then the shell (top bar, rail, tab bar). */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser()
  if (user.mustChangePassword) redirect("/change-password")

  const { items, unread } = await latestActivity(user.businessId, {
    take: 8,
    timezone: user.timezone,
  })

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
        roleLabel: user.role === "OWNER" ? "Owner" : (user.title ?? "Staff"),
      }}
      notifications={items}
      unread={unread}
    >
      <ThemeSync preference={user.themePreference} />
      {children}
    </AppShell>
  )
}
