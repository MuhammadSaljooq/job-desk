import "server-only"
import { db } from "@/lib/db"
import type { PhotoStage } from "./schema"

export type PhotoTile = {
  id: string
  stage: PhotoStage
  caption: string | null
  jobId: string | null
  customerId: string
  customerName: string
  createdAt: Date
  uploadedBy: string
  width: number | null
  height: number | null
  provider: "GOOGLE_DRIVE" | "DROPBOX" | "DEV_LOCAL"
  /** server-side only (used for "Open in Drive / Dropbox"); never sent to the browser */
  fileId: string
  path: string
}

const select = {
  id: true,
  stage: true,
  caption: true,
  jobId: true,
  customerId: true,
  createdAt: true,
  width: true,
  height: true,
  provider: true,
  fileId: true,
  path: true,
  customer: { select: { name: true } },
  uploadedBy: { select: { name: true } },
} as const

function toTile(p: {
  id: string
  stage: PhotoStage
  caption: string | null
  jobId: string | null
  customerId: string
  createdAt: Date
  width: number | null
  height: number | null
  provider: PhotoTile["provider"]
  fileId: string
  path: string
  customer: { name: string }
  uploadedBy: { name: string }
}): PhotoTile {
  return {
    id: p.id,
    stage: p.stage,
    caption: p.caption,
    jobId: p.jobId,
    customerId: p.customerId,
    customerName: p.customer.name,
    createdAt: p.createdAt,
    uploadedBy: p.uploadedBy.name,
    width: p.width,
    height: p.height,
    provider: p.provider,
    fileId: p.fileId,
    path: p.path,
  }
}

/** A customer's photos, newest first (gallery groups them by job). */
export async function listCustomerPhotos(businessId: string, customerId: string) {
  const rows = await db.photo.findMany({
    where: { businessId, customerId },
    select,
    orderBy: { createdAt: "desc" },
  })
  return rows.map(toTile)
}

/** The 6 newest photos for the dashboard. */
export async function latestPhotos(businessId: string, take = 6) {
  const rows = await db.photo.findMany({
    where: { businessId },
    select,
    orderBy: { createdAt: "desc" },
    take,
  })
  return rows.map(toTile)
}

/** All-photos gallery (rail): filter by customer, job, stage and date range. */
export async function listAllPhotos(
  businessId: string,
  f: { customerId?: string; jobId?: string; stage?: PhotoStage; from?: Date; to?: Date; q?: string }
) {
  const rows = await db.photo.findMany({
    where: {
      businessId,
      ...(f.customerId ? { customerId: f.customerId } : {}),
      ...(f.jobId ? { jobId: f.jobId } : {}),
      ...(f.stage ? { stage: f.stage } : {}),
      ...(f.from || f.to
        ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lt: f.to } : {}) } }
        : {}),
      ...(f.q ? { caption: { contains: f.q, mode: "insensitive" as const } } : {}),
    },
    select,
    orderBy: { createdAt: "desc" },
    take: 300,
  })
  return rows.map(toTile)
}
