import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Mail, MapPin, MessageSquare, Phone } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { dayInZone, formatMonthOf } from "@/lib/dates"
import { isOverdue } from "@/lib/status"
import { storageStatus } from "@/lib/storage"
import { ProfileCard } from "@/components/shared/profile-card"
import { CustomerSubpage } from "@/features/customers/components/customer-subpage"
import { ProfileCardMenu } from "@/features/customers/components/profile-card-menu"
import { contactLinks } from "@/features/customers/contact"
import { CUSTOMER_TYPE_LABEL } from "@/features/customers/schema"
import { loadProfile } from "@/features/customers/profile-view"
import { listCustomerPhotos } from "@/features/photos/queries"
import { toGalleryPhotos } from "@/features/photos/view"
import { Gallery } from "@/features/photos/components/gallery"
import { UploadCard, type StorageState } from "@/features/photos/components/upload-card"

export const metadata: Metadata = { title: "Job site photos" }

export default async function CustomerPhotosPage({
  params,
  searchParams,
}: PageProps<"/customers/[id]/photos">) {
  const user = await requireUser()
  const { id } = await params
  const sp = await searchParams
  const profile = await loadProfile(user.businessId, id)
  if (!profile) notFound()
  const c = profile.customer

  const [tiles, status] = await Promise.all([
    listCustomerPhotos(user.businessId, c.id),
    storageStatus(user.businessId),
  ])
  const photos = await toGalleryPhotos(user.businessId, tiles, user.timezone)
  const today = dayInZone(new Date(), user.timezone)
  const jobs = c.jobs.map((j) => ({
    id: j.id,
    title: j.title,
    stage: j.stage,
    overdue: isOverdue(
      j.stage,
      j.scheduledAt ? dayInZone(j.scheduledAt, user.timezone) : null,
      today
    ),
  }))
  // Upload into the active job by default (the one being worked on), else the newest.
  const active = c.jobs.filter((j) => j.stage !== "COMPLETED")
  const defaultJobId =
    (typeof sp.job === "string" && c.jobs.some((j) => j.id === sp.job) ? sp.job : null) ??
    active.find((j) => j.stage === "IN_PROGRESS")?.id ??
    active[0]?.id ??
    null
  const storage: StorageState =
    status.state === "connected"
      ? "connected"
      : status.state === "dev-local"
        ? "dev-local"
        : status.state === "revoked"
          ? "revoked"
          : "none"
  const links = contactLinks(c)

  return (
    <CustomerSubpage customerId={c.id} title="Job site photos">
      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="grid grid-cols-1 gap-[18px]">
          <ProfileCard
            name={c.name}
            subtitle={CUSTOMER_TYPE_LABEL[c.type]}
            menu={
              <ProfileCardMenu customerId={c.id} name={c.name} canDelete={user.role === "OWNER"} />
            }
            actions={[
              { label: "Message", icon: <MessageSquare />, href: links.sms },
              { label: "Call", icon: <Phone />, href: links.tel },
              { label: "Directions", icon: <MapPin />, href: links.maps },
              { label: "Email", icon: <Mail />, href: links.mailto },
            ]}
            sinceLabel="Customer since"
            sinceValue={formatMonthOf(c.createdAt, user.timezone)}
            status={
              c.status === "ACTIVE"
                ? { label: "Active", tone: "mint", check: true }
                : { label: "Past customer", tone: "neutral" }
            }
          />
          <UploadCard
            customerId={c.id}
            jobs={c.jobs.map((j) => ({ id: j.id, title: j.title }))}
            defaultJobId={defaultJobId}
            storage={storage}
            isOwner={user.role === "OWNER"}
          />
        </div>
        <Gallery
          photos={photos}
          jobs={jobs}
          jobOptions={c.jobs.map((j) => ({ id: j.id, title: j.title }))}
        />
      </div>
    </CustomerSubpage>
  )
}
