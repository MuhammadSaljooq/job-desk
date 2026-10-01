"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireOwner, requireUser } from "@/lib/auth"
import { ActionError, runAction } from "@/lib/action"
import { customerSchema, noteSchema, type CustomerInput } from "./schema"
import { relocatePhotos } from "@/features/photos/service"

async function ownCustomer(businessId: string, customerId: unknown) {
  if (typeof customerId !== "string" || !customerId) throw new ActionError("Customer not found.")
  const c = await db.customer.findFirst({
    where: { id: customerId, businessId },
    select: { id: true, name: true },
  })
  if (!c) throw new ActionError("That customer no longer exists.")
  return c
}

export async function createCustomerAction(input: CustomerInput) {
  return runAction(async () => {
    const user = await requireUser()
    const data = customerSchema.parse(input)
    const customer = await db.$transaction(async (tx) => {
      const c = await tx.customer.create({ data: { ...data, businessId: user.businessId } })
      await tx.activity.create({
        data: {
          businessId: user.businessId,
          type: "CUSTOMER_CREATED",
          message: "New customer",
          detail: `${c.name} was added`,
          customerId: c.id,
          actorId: user.userId,
          entity: "customer",
          entityId: c.id,
          readAt: new Date(),
        },
      })
      return c
    })
    revalidatePath("/customers")
    return { id: customer.id }
  })
}

export async function updateCustomerAction(customerId: string, input: CustomerInput) {
  return runAction(async () => {
    const user = await requireUser()
    const before = await ownCustomer(user.businessId, customerId)
    const data = customerSchema.parse(input)
    await db.customer.update({ where: { id: customerId }, data })
    // Keep the Drive / Dropbox folders named after the customer.
    if (data.name !== before.name) await relocatePhotos(user.businessId, { customerId })
    revalidatePath("/customers")
    revalidatePath(`/customers/${customerId}`, "layout")
    return { id: customerId }
  })
}

/** Owner only (staff can do everything except delete customers). Cascades to jobs, quotes. */
export async function deleteCustomerAction(customerId: string) {
  return runAction(async () => {
    const user = await requireOwner()
    const c = await ownCustomer(user.businessId, customerId)
    await db.customer.delete({ where: { id: c.id } })
    revalidatePath("/customers")
    revalidatePath("/", "layout")
    return { name: c.name }
  })
}

export async function addNoteAction(customerId: string, body: string) {
  return runAction(async () => {
    const user = await requireUser()
    const c = await ownCustomer(user.businessId, customerId)
    const data = noteSchema.parse({ body })
    await db.activity.create({
      data: {
        businessId: user.businessId,
        type: "NOTE",
        message: user.role === "OWNER" ? "Note" : `Note from ${user.name.split(" ")[0]}`,
        detail: data.body,
        customerId: c.id,
        actorId: user.userId,
        entity: "customer",
        entityId: c.id,
        readAt: new Date(), // your own note isn't news to you
      },
    })
    revalidatePath(`/customers/${c.id}`, "layout")
    return { ok: true }
  })
}
