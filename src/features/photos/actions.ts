"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { runAction } from "@/lib/action"
import { deletePhoto, savePhotos, updatePhoto } from "./service"
import type { UpdatePhotoInput } from "./schema"

function revalidate(customerId: string) {
  revalidatePath(`/customers/${customerId}`, "layout")
  revalidatePath("/photos")
  revalidatePath("/")
}

export async function savePhotosAction(input: unknown) {
  return runAction(async () => {
    const user = await requireUser()
    const saved = await savePhotos(user, input)
    if (saved[0]) revalidate(saved[0].customerId)
    return { count: saved.length }
  })
}

export async function updatePhotoAction(photoId: string, input: UpdatePhotoInput) {
  return runAction(async () => {
    const user = await requireUser()
    const p = await updatePhoto(user, photoId, input)
    revalidate(p.customerId)
    return { id: p.id }
  })
}

export async function deletePhotoAction(photoId: string) {
  return runAction(async () => {
    const user = await requireUser()
    const { customerId } = await deletePhoto(user, photoId)
    revalidate(customerId)
    return { ok: true }
  })
}
