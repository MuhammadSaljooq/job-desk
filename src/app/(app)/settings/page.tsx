import type { Metadata } from "next"
import { Suspense } from "react"
import { Mail, MapPin, MessageSquare, Phone } from "lucide-react"
import { format, parseISO } from "date-fns"
import { requireUser } from "@/lib/auth"
import { ProfileCard } from "@/components/shared/profile-card"
import { getSettingsView } from "@/features/settings/queries"
import { DataCard } from "@/features/settings/components/data-card"
import { SettingsForm } from "@/features/settings/components/settings-form"
import { StorageCard } from "@/features/settings/components/storage-card"
import { TeamCard } from "@/features/settings/components/team-card"

export const metadata: Metadata = { title: "Settings" }

/** Settings (shot-settings.png). Owner edits; staff see it read-only (roles enforced in actions). */
export default async function SettingsPage() {
  const user = await requireUser()
  const view = await getSettingsView(user.businessId)
  const b = view.business
  const isOwner = user.role === "OWNER"
  const maps = b.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`
    : undefined

  return (
    <SettingsForm
      business={b}
      readOnly={!isOwner}
      highestQuoteNumber={view.highestQuoteNumber}
      businessCard={
        <ProfileCard
          name={b.name}
          subtitle={b.tagline ?? "Your business"}
          avatarColor={user.avatarColor}
          actions={[
            {
              label: "Message",
              icon: <MessageSquare />,
              href: b.phone ? `sms:${b.phone}` : undefined,
            },
            { label: "Call", icon: <Phone />, href: b.phone ? `tel:${b.phone}` : undefined },
            { label: "Directions", icon: <MapPin />, href: maps },
            { label: "Email", icon: <Mail />, href: b.email ? `mailto:${b.email}` : undefined },
          ]}
          sinceLabel="In business since"
          sinceValue={format(parseISO(b.createdAt), "MMM yyyy")}
          status={{ label: "Active", tone: "mint", check: true }}
        />
      }
    >
      <TeamCard team={view.team} currentUserId={user.userId} readOnly={!isOwner} />
      {isOwner && <DataCard businessName={b.name} />}
      {isOwner && (
        <Suspense>
          <StorageCard storage={view.storage} />
        </Suspense>
      )}
    </SettingsForm>
  )
}
