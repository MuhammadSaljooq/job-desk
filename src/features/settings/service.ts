import "server-only"
import { db } from "@/lib/db"
import { ActionError } from "@/lib/action"
import type { CurrentUser } from "@/lib/auth"
import { dayInZone } from "@/lib/dates"
import { ROOT_FOLDER } from "@/lib/storage/paths"
import { getStorage, getStorageFor, withStorage, type ProviderKind } from "@/lib/storage"
import { clearSampleRecords, seedSampleRecords } from "./sample-data"

// ---------------------------------------------------------------- logo (D15)

const THUMB_MAX_BYTES = 60_000 // the browser resizes to 400px; ~30 KB is typical
const THUMB_MIME = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/

/** Decode the browser-made thumbnail and check it really is a small PNG / JPEG / WebP. */
export function parseLogoThumb(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const m = THUMB_MIME.exec(dataUrl)
  if (!m) throw new ActionError("Use a PNG, JPG or WebP image for the logo.")
  const bytes = new Uint8Array(Buffer.from(m[2], "base64"))
  if (bytes.byteLength > THUMB_MAX_BYTES) throw new ActionError("That logo is too large.")
  const head = Array.from(bytes.slice(0, 12))
  const isPng = head.slice(0, 4).join() === "137,80,78,71"
  const isJpeg = head[0] === 0xff && head[1] === 0xd8
  const isWebp =
    String.fromCharCode(...head.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...head.slice(8, 12)) === "WEBP"
  const ok =
    (m[1] === "image/png" && isPng) ||
    (m[1] === "image/jpeg" && isJpeg) ||
    (m[1] === "image/webp" && isWebp)
  if (!ok) throw new ActionError("That file isn't a valid image.")
  return { bytes, mime: m[1] }
}

export function logoPath(mimeType: string, at: Date, timeZone: string) {
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg"
  const stamp = dayInZone(at, timeZone)
  return `${ROOT_FOLDER}/Business/logo-${stamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`
}

// ---------------------------------------------------------------- team (D3, D14)

/** Owners left after a change; the business must always keep at least one. */
async function ownersOtherThan(businessId: string, userId: string) {
  return db.user.count({
    where: { businessId, role: "OWNER", removedAt: null, id: { not: userId } },
  })
}

export async function ownMember(businessId: string, userId: string) {
  const member = await db.user.findFirst({ where: { id: userId, businessId, removedAt: null } })
  if (!member) throw new ActionError("That team member no longer exists.")
  return member
}

export async function assertKeepsAnOwner(businessId: string, userId: string) {
  if ((await ownersOtherThan(businessId, userId)) === 0)
    throw new ActionError("The business needs at least one owner.")
}

/**
 * Remove a member but keep their history (jobs, photos, quotes stay attributed). They can't
 * sign in, their sessions end, and they come off jobs that aren't finished yet.
 */
export async function removeMember(user: CurrentUser, userId: string) {
  if (userId === user.userId) throw new ActionError("You can't remove yourself.")
  const member = await ownMember(user.businessId, userId)
  if (member.role === "OWNER") await assertKeepsAnOwner(user.businessId, userId)
  await db.$transaction(async (tx) => {
    const open = await tx.job.findMany({
      where: {
        businessId: user.businessId,
        stage: { not: "COMPLETED" },
        assignees: { some: { id: userId } },
      },
      select: { id: true },
    })
    for (const j of open)
      await tx.job.update({
        where: { id: j.id },
        data: { assignees: { disconnect: { id: userId } } },
      })
    await tx.session.deleteMany({ where: { userId } })
    await tx.user.update({
      where: { id: userId },
      data: {
        removedAt: new Date(),
        passwordHash: null,
        // frees the address so the owner can add the person again later
        email: `removed-${userId}@removed.invalid`,
      },
    })
  })
  return { name: member.name }
}

// ---------------------------------------------------------------- storage switch (D17)

export const COPY_BATCH = 5

/** Where the copy stands: photos still on another provider than the current connection. */
export async function copyStatus(businessId: string) {
  const conn = await db.storageConnection.findUnique({ where: { businessId } })
  if (!conn || conn.status !== "ACTIVE") return null
  const [remaining, total] = await Promise.all([
    db.photo.count({ where: { businessId, provider: { not: conn.provider } } }),
    db.photo.count({ where: { businessId } }),
  ])
  return { provider: conn.provider, previous: conn.previousProvider, remaining, total }
}

/**
 * Copy the next few photos from their old provider to the connected one, keeping the same
 * folder layout, and point the rows at the new files. Originals are left where they were.
 * `skip` holds ids that failed earlier in this run, so one broken file can't stall the rest.
 * When nothing is left on the previous provider, its stored credentials are wiped.
 */
export async function copyPhotosBatch(businessId: string, skip: string[] = []) {
  const target = await getStorage(businessId)
  if (!target) throw new ActionError("Connect Google Drive or Dropbox first.")
  const photos = await db.photo.findMany({
    where: { businessId, provider: { not: target.kind }, id: { notIn: skip } },
    orderBy: { createdAt: "asc" },
    take: COPY_BATCH,
  })
  const failed: string[] = []
  const sources = new Map<ProviderKind, Awaited<ReturnType<typeof getStorageFor>>>()
  for (const p of photos) {
    try {
      if (!sources.has(p.provider))
        sources.set(p.provider, await getStorageFor(businessId, p.provider))
      const source = sources.get(p.provider)
      if (!source) throw new Error("old provider unavailable")
      const { bytes } = await source.download(p.fileId)
      const file = await withStorage(businessId, () => target.put(p.path, bytes, p.mimeType))
      await db.photo.update({
        where: { id: p.id },
        data: { provider: target.kind, fileId: file.fileId, path: file.path },
      })
    } catch (err) {
      console.error("[storage copy]", p.id, err instanceof Error ? err.message : err)
      failed.push(p.id)
    }
  }
  const remaining = await db.photo.count({
    where: { businessId, provider: { not: target.kind } },
  })
  const conn = await db.storageConnection.findUnique({ where: { businessId } })
  if (conn?.previousProvider) {
    const leftOnPrevious = await db.photo.count({
      where: { businessId, provider: conn.previousProvider },
    })
    if (leftOnPrevious === 0)
      await db.storageConnection.update({
        where: { businessId },
        data: {
          previousProvider: null,
          previousAccountEmail: null,
          previousEncryptedRefreshToken: null,
          previousRootFolderId: null,
        },
      })
  }
  return {
    copied: photos.length - failed.length,
    failed,
    remaining,
    total: await db.photo.count({ where: { businessId } }),
  }
}

// ---------------------------------------------------------------- data

/** Settings > Data > Reload sample data: replace the demo rows, keep real ones. */
export async function reloadSampleData(user: CurrentUser) {
  const staff = await db.user.findMany({
    where: { businessId: user.businessId, role: "STAFF", removedAt: null },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true },
  })
  const team = {
    ownerId: user.userId,
    jordanId: staff[0]?.id ?? user.userId,
    alexId: staff[1]?.id ?? staff[0]?.id ?? user.userId,
  }
  await db.$transaction(
    async (tx) => {
      await clearSampleRecords(tx, user.businessId)
      await seedSampleRecords(tx, {
        businessId: user.businessId,
        timezone: user.timezone,
        today: dayInZone(new Date(), user.timezone),
        team,
      })
    },
    { timeout: 60_000 }
  )
}

/**
 * Settings > Data > Clear all data: every customer, job, photo record, quote, transaction,
 * activity and catalog item. Keeps the business, its settings, the team and storage.
 * Photo files stay in Drive / Dropbox (we never delete the owner's files in bulk).
 */
export async function clearAllData(businessId: string) {
  await db.$transaction(async (tx) => {
    await tx.activity.deleteMany({ where: { businessId } })
    await tx.transaction.deleteMany({ where: { businessId } })
    await tx.quote.deleteMany({ where: { businessId } }) // lines cascade
    await tx.photo.deleteMany({ where: { businessId } })
    await tx.job.deleteMany({ where: { businessId } })
    await tx.customer.deleteMany({ where: { businessId } })
    await tx.catalogItem.deleteMany({ where: { businessId } })
    await tx.catalogCategory.deleteMany({ where: { businessId } })
  })
}
