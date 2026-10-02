"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { requireOwner, requireUser } from "@/lib/auth"
import { ActionError, runAction } from "@/lib/action"
import { signToken, verifyToken } from "@/lib/crypto"
import { getStorage, getStorageFor, withStorage, ALLOWED_PHOTO_TYPES } from "@/lib/storage"
import { hashPassword, passwordSchema } from "@/features/auth/credentials"
import {
  newMemberSchema,
  settingsSchema,
  themeSchema,
  updateMemberSchema,
  type NewMemberInput,
  type SettingsInput,
  type UpdateMemberInput,
} from "./schema"
import {
  assertKeepsAnOwner,
  clearAllData,
  copyPhotosBatch,
  logoPath,
  ownMember,
  parseLogoThumb,
  reloadSampleData,
  removeMember,
} from "./service"

const everywhere = () => revalidatePath("/", "layout")

/** Business profile + quotes + notifications ("Save settings"). Owner only. */
export async function saveSettingsAction(input: SettingsInput) {
  return runAction(async () => {
    const user = await requireOwner()
    const data = settingsSchema.parse(input)
    // A lower number would collide with an existing quote (numbers are unique).
    const highest = await db.quote.aggregate({
      where: { businessId: user.businessId },
      _max: { number: true },
    })
    const max = highest._max.number ?? 0
    if (data.nextQuoteNumber <= max)
      throw new ActionError(`The next quote number must be above Q-${max}.`)
    await db.business.update({ where: { id: user.businessId }, data })
    everywhere()
    return null
  })
}

// ---------------------------------------------------------------- team

export async function addMemberAction(input: NewMemberInput) {
  return runAction(async () => {
    const user = await requireOwner()
    const data = newMemberSchema.parse(input)
    if (await db.user.findUnique({ where: { email: data.email }, select: { id: true } }))
      throw new ActionError("That email is already used by another account.")
    const member = await db.user.create({
      data: {
        businessId: user.businessId,
        name: data.name,
        email: data.email,
        role: data.role,
        title: data.title,
        avatarColor: data.avatarColor,
        passwordHash: await hashPassword(data.password),
        mustChangePassword: true, // D3: they pick their own password on first sign in
      },
      select: { id: true, name: true },
    })
    revalidatePath("/settings")
    return member
  })
}

export async function updateMemberAction(userId: string, input: UpdateMemberInput) {
  return runAction(async () => {
    const user = await requireOwner()
    const data = updateMemberSchema.parse(input)
    const member = await ownMember(user.businessId, userId)
    if (member.role === "OWNER" && data.role !== "OWNER")
      await assertKeepsAnOwner(user.businessId, userId)
    await db.user.update({ where: { id: member.id }, data })
    everywhere()
    return null
  })
}

/** A new temporary password; they must change it at their next sign in. */
export async function resetMemberPasswordAction(userId: string, password: string) {
  return runAction(async () => {
    const user = await requireOwner()
    if (userId === user.userId) throw new ActionError("Use Change password for your own account.")
    const member = await ownMember(user.businessId, userId)
    const pw = passwordSchema.parse(password)
    await db.$transaction([
      db.user.update({
        where: { id: member.id },
        data: { passwordHash: await hashPassword(pw), mustChangePassword: true },
      }),
      db.session.deleteMany({ where: { userId: member.id } }),
    ])
    return null
  })
}

export async function removeMemberAction(userId: string) {
  return runAction(async () => {
    const user = await requireOwner()
    const res = await removeMember(user, userId)
    everywhere()
    return res
  })
}

// ---------------------------------------------------------------- appearance (any user)

export async function setThemeAction(theme: string) {
  return runAction(async () => {
    const user = await requireUser()
    await db.user.update({
      where: { id: user.userId },
      data: { themePreference: themeSchema.parse(theme) },
    })
    return null
  })
}

// ---------------------------------------------------------------- logo (D15)

type LogoClaims = { b: string; p: string; r: string; k: string }

/**
 * Step 1: when storage is connected, a direct upload URL for the original logo. Without
 * storage the logo is still saved (the small copy only), so quotes can show it.
 */
export async function startLogoUploadAction(input: { mimeType: string; size: number }) {
  return runAction(async () => {
    const user = await requireOwner()
    if (!ALLOWED_PHOTO_TYPES.test(input.mimeType) || /heic|heif|gif/i.test(input.mimeType))
      throw new ActionError("Use a PNG, JPG or WebP image for the logo.")
    if (!(input.size > 0 && input.size <= 5 * 1024 * 1024))
      throw new ActionError("Keep the logo under 5 MB.")
    const storage = await getStorage(user.businessId)
    if (!storage) return { upload: null, token: null }
    const h = await headers()
    const origin = h.get("origin") ?? `https://${h.get("host")}`
    const path = logoPath(input.mimeType, new Date(), user.timezone)
    const target = await withStorage(user.businessId, () =>
      storage.createUploadSession({ path, mimeType: input.mimeType, size: input.size, origin })
    )
    const claims: LogoClaims = { b: user.businessId, p: path, r: target.ref, k: storage.kind }
    return {
      upload: { url: target.url, method: target.method, headers: target.headers },
      token: signToken(claims, 60 * 60),
    }
  })
}

/** Step 2: save the small copy (always) and the original's file id (when uploaded). */
export async function saveLogoAction(input: {
  thumb: string
  token: string | null
  response: unknown
}) {
  return runAction(async () => {
    const user = await requireOwner()
    const thumb = parseLogoThumb(input.thumb)
    let logoFileId: string | null = null
    if (input.token) {
      const claims = verifyToken<LogoClaims>(input.token)
      if (!claims || claims.b !== user.businessId)
        throw new ActionError("That upload expired. Please try again.")
      const storage = await getStorageFor(user.businessId, claims.k as never)
      if (!storage) throw new ActionError("Photo storage was disconnected. Please reconnect it.")
      const file = await withStorage(user.businessId, () =>
        storage.finalizeUpload({ path: claims.p, ref: claims.r, response: input.response })
      )
      logoFileId = file.fileId
    }
    await db.business.update({
      where: { id: user.businessId },
      data: {
        logoThumb: Buffer.from(thumb.bytes),
        logoMime: thumb.mime,
        logoFileId,
      },
    })
    everywhere()
    return null
  })
}

export async function removeLogoAction() {
  return runAction(async () => {
    const user = await requireOwner()
    await db.business.update({
      where: { id: user.businessId },
      data: { logoThumb: null, logoMime: null, logoFileId: null },
    })
    everywhere()
    return null
  })
}

// ---------------------------------------------------------------- storage

/** Photos stay in Drive / Dropbox, but JobDesk can't show them until it's connected again. */
export async function disconnectStorageAction() {
  return runAction(async () => {
    const user = await requireOwner()
    await db.storageConnection.deleteMany({ where: { businessId: user.businessId } })
    everywhere()
    return null
  })
}

export async function copyPhotosBatchAction(skip: string[] = []) {
  return runAction(async () => {
    const user = await requireOwner()
    const res = await copyPhotosBatch(user.businessId, skip.slice(0, 500))
    if (res.remaining === res.failed.length) everywhere()
    return res
  })
}

// ---------------------------------------------------------------- data

export async function reloadSampleDataAction() {
  return runAction(async () => {
    const user = await requireOwner()
    await reloadSampleData(user)
    everywhere()
    return null
  })
}

/** Needs the business name typed exactly, because it can't be undone. */
export async function clearAllDataAction(confirmName: string) {
  return runAction(async () => {
    const user = await requireOwner()
    const business = await db.business.findUniqueOrThrow({
      where: { id: user.businessId },
      select: { name: true },
    })
    if (confirmName.trim() !== business.name)
      throw new ActionError("Type the business name exactly to confirm.")
    await clearAllData(user.businessId)
    everywhere()
    return null
  })
}
