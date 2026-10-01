import type { Metadata } from "next"
import { Suspense } from "react"
import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { zonedInstant, shiftDay } from "@/lib/dates"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { listAllPhotos } from "@/features/photos/queries"
import { toGalleryPhotos } from "@/features/photos/view"
import { AllPhotos } from "@/features/photos/components/all-photos"
import { PHOTO_STAGES, type PhotoStage } from "@/features/photos/schema"

export const metadata: Metadata = { title: "Photos" }

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)

export default async function PhotosPage({ searchParams }: PageProps<"/photos">) {
  const user = await requireUser()
  const sp = await searchParams
  const stage = (PHOTO_STAGES as readonly string[]).includes(String(sp.stage))
    ? (sp.stage as PhotoStage)
    : undefined
  const customerId = typeof sp.customer === "string" ? sp.customer : undefined

  const [tiles, customers, jobs] = await Promise.all([
    listAllPhotos(user.businessId, {
      customerId,
      stage,
      from: isDay(sp.from) ? zonedInstant(sp.from, "00:00", user.timezone) : undefined,
      to: isDay(sp.to) ? zonedInstant(shiftDay(sp.to, 1), "00:00", user.timezone) : undefined,
    }),
    db.customer.findMany({
      where: { businessId: user.businessId, photos: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.job.findMany({
      where: { businessId: user.businessId },
      select: { id: true, title: true, customerId: true },
    }),
  ])
  const photos = await toGalleryPhotos(user.businessId, tiles, user.timezone)
  const jobOptionsByCustomer: Record<string, { id: string; title: string }[]> = {}
  for (const j of jobs)
    (jobOptionsByCustomer[j.customerId] ??= []).push({ id: j.id, title: j.title })

  return (
    <>
      <Breadcrumb title="Photos" />
      <Suspense>
        <AllPhotos
          photos={photos}
          customers={customers}
          jobOptionsByCustomer={jobOptionsByCustomer}
        />
      </Suspense>
    </>
  )
}
