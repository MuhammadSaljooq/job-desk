import "server-only"
import { db } from "@/lib/db"
import type { CurrentUser } from "@/lib/auth"
import { ActionError } from "@/lib/action"
import { signToken, verifyToken } from "@/lib/crypto"
import { photoPath, relocatedPath } from "@/lib/storage/paths"
import { getStorage, getStorageFor, withStorage, type ProviderKind } from "@/lib/storage"
import {
  PHOTO_STAGE_LABEL,
  savePhotosSchema,
  updatePhotoSchema,
  uploadRequestSchema,
  type PhotoStage,
  type UpdatePhotoInput,
  type UploadRequest,
} from "./schema"

type SessionClaims = {
  b: string // businessId
  u: string // userId
  c: string // customerId
  j: string | null // jobId
  s: PhotoStage
  p: string // path
  r: string // provider ref
  k: ProviderKind
  m: string // mime type
  z: number // size
}

const SESSION_TTL = 60 * 60 // an hour to finish the upload

function shortId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-2)
}

async function ownCustomerAndJob(businessId: string, customerId: string, jobId: string | null) {
  const customer = await db.customer.findFirst({
    where: { id: customerId, businessId },
    select: { id: true, name: true },
  })
  if (!customer) throw new ActionError("That customer no longer exists.")
  let job: { id: string; title: string } | null = null
  if (jobId) {
    job = await db.job.findFirst({
      where: { id: jobId, businessId, customerId },
      select: { id: true, title: true },
    })
    if (!job) throw new ActionError("That job isn't on this customer.")
  }
  return { customer, job }
}

/**
 * Step 1 of an upload: check the user can add photos to this customer / job, that the file
 * is an image under 15 MB, then ask the provider for a direct upload URL. Returns that URL
 * and a signed token the browser hands back in step 3 (savePhotos).
 */
export async function startUpload(user: CurrentUser, input: UploadRequest, origin: string) {
  const data = uploadRequestSchema.parse(input)
  const { customer, job } = await ownCustomerAndJob(user.businessId, data.customerId, data.jobId)
  const storage = await getStorage(user.businessId)
  if (!storage) {
    throw new ActionError(
      user.role === "OWNER"
        ? "Connect Google Drive or Dropbox in Settings to upload photos."
        : "Ask the owner to connect photo storage first."
    )
  }
  const path = photoPath({
    customerName: customer.name,
    jobTitle: job?.title,
    stage: data.stage,
    at: new Date(),
    timeZone: user.timezone,
    shortId: shortId(),
    mimeType: data.mimeType,
  })
  const target = await withStorage(user.businessId, () =>
    storage.createUploadSession({ path, mimeType: data.mimeType, size: data.size, origin })
  )
  const claims: SessionClaims = {
    b: user.businessId,
    u: user.userId,
    c: customer.id,
    j: job?.id ?? null,
    s: data.stage,
    p: path,
    r: target.ref,
    k: storage.kind,
    m: data.mimeType,
    z: data.size,
  }
  return {
    upload: { url: target.url, method: target.method, headers: target.headers },
    token: signToken(claims, SESSION_TTL),
  }
}

/**
 * Step 3: the browser finished uploading straight to the provider. Confirm each file with
 * the provider, store provider + fileId + path (never the image), write one Activity row.
 */
export async function savePhotos(user: CurrentUser, input: unknown) {
  const { items } = savePhotosSchema.parse(input)
  const saved: { id: string; customerId: string; jobId: string | null; stage: PhotoStage }[] = []
  for (const item of items) {
    const claims = verifyToken<SessionClaims>(item.token)
    if (!claims || claims.b !== user.businessId || claims.u !== user.userId) {
      throw new ActionError("That upload expired. Please try again.")
    }
    const storage = await getStorageFor(user.businessId, claims.k)
    if (!storage)
      throw new ActionError("Photo storage was disconnected. Please reconnect it and retry.")
    const file = await withStorage(user.businessId, () =>
      storage.finalizeUpload({ path: claims.p, ref: claims.r, response: item.response })
    )
    // The customer / job may have been deleted while the upload ran.
    const { job } = await ownCustomerAndJob(user.businessId, claims.c, claims.j).catch(() => ({
      job: null,
    }))
    const photo = await db.photo.create({
      data: {
        businessId: user.businessId,
        customerId: claims.c,
        jobId: job?.id ?? null,
        provider: claims.k,
        fileId: file.fileId,
        path: file.path,
        mimeType: claims.m,
        sizeBytes: claims.z,
        width: item.width ?? null,
        height: item.height ?? null,
        stage: claims.s,
        caption: item.caption ?? null,
        uploadedById: user.userId,
      },
      select: { id: true, customerId: true, jobId: true, stage: true },
    })
    saved.push(photo)
  }

  // One activity per batch: "2 During photos added to Unit 12 turnover".
  const first = saved[0]
  const sameStage = saved.every((p) => p.stage === first.stage)
  const job = first.jobId
    ? await db.job.findUnique({ where: { id: first.jobId }, select: { title: true } })
    : null
  const n = saved.length
  const what = `${n} ${sameStage ? `${PHOTO_STAGE_LABEL[first.stage]} ` : ""}photo${n === 1 ? "" : "s"}`
  await db.activity.create({
    data: {
      businessId: user.businessId,
      type: "PHOTO_UPLOADED",
      message: n === 1 ? "Photo uploaded" : "Photos uploaded",
      detail: `${what} added to ${job?.title ?? "General"}`,
      customerId: first.customerId,
      actorId: user.userId,
      entity: "photo",
      entityId: first.id,
      readAt: new Date(),
    },
  })
  return saved
}

async function ownPhoto(businessId: string, photoId: string) {
  const photo = await db.photo.findFirst({
    where: { id: photoId, businessId },
    include: { customer: { select: { id: true, name: true } }, job: { select: { title: true } } },
  })
  if (!photo) throw new ActionError("That photo no longer exists.")
  return photo
}

/** Edit caption / stage / job. A stage or job change moves the file to the matching folder. */
export async function updatePhoto(user: CurrentUser, photoId: string, input: UpdatePhotoInput) {
  const data = updatePhotoSchema.parse(input)
  const photo = await ownPhoto(user.businessId, photoId)
  const { job } = await ownCustomerAndJob(user.businessId, photo.customerId, data.jobId)
  let file = { fileId: photo.fileId, path: photo.path }
  if (data.stage !== photo.stage || (data.jobId ?? null) !== photo.jobId) {
    const target = relocatedPath(photo.path, {
      customerName: photo.customer.name,
      jobTitle: job?.title,
      stage: data.stage,
    })
    const storage = await getStorageFor(user.businessId, photo.provider)
    if (!storage)
      throw new ActionError("Photo storage isn't connected, so the file can't be moved.")
    file = await withStorage(user.businessId, () => storage.move(photo.fileId, target))
  }
  return db.photo.update({
    where: { id: photo.id },
    data: {
      caption: data.caption ?? null,
      stage: data.stage,
      jobId: data.jobId ?? null,
      fileId: file.fileId,
      path: file.path,
    },
  })
}

/** Delete the file in Drive / Dropbox too. A file that's already gone isn't an error. */
export async function deletePhoto(user: CurrentUser, photoId: string) {
  const photo = await ownPhoto(user.businessId, photoId)
  const storage = await getStorageFor(user.businessId, photo.provider)
  if (storage) await withStorage(user.businessId, () => storage.delete(photo.fileId))
  await db.photo.delete({ where: { id: photo.id } })
  return { customerId: photo.customerId }
}

/**
 * After a customer or job is renamed, move its photos so the folders in Drive / Dropbox
 * match the new name. Failures are logged; the database keeps the old path until it works.
 */
export async function relocatePhotos(
  businessId: string,
  where: { customerId?: string; jobId?: string }
) {
  const photos = await db.photo.findMany({
    where: { businessId, ...where },
    include: { customer: { select: { name: true } }, job: { select: { title: true } } },
  })
  let moved = 0
  for (const p of photos) {
    const target = relocatedPath(p.path, {
      customerName: p.customer.name,
      jobTitle: p.job?.title,
      stage: p.stage,
    })
    if (target === p.path) continue
    try {
      const storage = await getStorageFor(businessId, p.provider)
      if (!storage) continue
      const file = await withStorage(businessId, () => storage.move(p.fileId, target))
      await db.photo.update({ where: { id: p.id }, data: { fileId: file.fileId, path: file.path } })
      moved++
    } catch (err) {
      console.error("[photos] couldn't move", p.id, err)
    }
  }
  return moved
}
