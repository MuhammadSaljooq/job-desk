"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { runAction } from "@/lib/action"

export async function markAllActivityReadAction() {
  return runAction(async () => {
    const user = await requireUser()
    const { count } = await db.activity.updateMany({
      where: { businessId: user.businessId, readAt: null },
      data: { readAt: new Date() },
    })
    revalidatePath("/", "layout")
    return { count }
  })
}
