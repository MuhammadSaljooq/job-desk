import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { listTeam } from "@/features/customers/queries"
import { loadProfile } from "@/features/customers/profile-view"
import { ProfileDialogs } from "@/features/customers/components/profile-dialogs"

/** Shared by every customer tab: 404 for other businesses' ids, and the edit / job dialogs. */
export default async function CustomerLayout({ children, params }: LayoutProps<"/customers/[id]">) {
  const user = await requireUser()
  const { id } = await params
  const [profile, team] = await Promise.all([
    loadProfile(user.businessId, id),
    listTeam(user.businessId),
  ])
  if (!profile) notFound()
  const c = profile.customer
  return (
    <ProfileDialogs
      customerId={c.id}
      team={team.map((t) => ({
        id: t.id,
        name: t.name,
        avatarColor: t.avatarColor,
        title: t.title,
      }))}
      customer={{
        name: c.name,
        type: c.type,
        phone: c.phone ?? "",
        email: c.email ?? "",
        address: c.address ?? "",
        accessNotes: c.accessNotes ?? "",
        preferredContact: c.preferredContact ?? "",
        notes: c.notes ?? "",
        status: c.status,
      }}
    >
      {children}
    </ProfileDialogs>
  )
}
