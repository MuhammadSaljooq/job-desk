"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireOwner, requireUser } from "@/lib/auth"
import { ActionError, runAction } from "@/lib/action"
import { dayToDbDate } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { quoteTotalsFor } from "@/features/quotes/sql"
import { CATEGORY_LABEL } from "./categories"
import { transactionSchema, type TransactionInput } from "./schema"

function revalidate(customerId?: string | null, quoteId?: string | null) {
  revalidatePath("/books")
  revalidatePath("/quotes")
  revalidatePath("/")
  if (customerId) revalidatePath(`/customers/${customerId}`, "layout")
  if (quoteId) revalidatePath(`/quotes/${quoteId}`)
}

/** Customer and quote must belong to the business, and the quote to that customer. */
async function checkLinks(businessId: string, customerId: string | null, quoteId: string | null) {
  let customer = customerId
  if (quoteId) {
    const q = await db.quote.findFirst({
      where: { id: quoteId, businessId },
      select: { customerId: true, status: true },
    })
    if (!q) throw new ActionError("That quote no longer exists.")
    if (customer && customer !== q.customerId)
      throw new ActionError("That quote belongs to a different customer.")
    customer = q.customerId
  }
  if (customer) {
    const c = await db.customer.findFirst({
      where: { id: customer, businessId },
      select: { id: true },
    })
    if (!c) throw new ActionError("That customer no longer exists.")
  }
  return customer
}

export async function createTransactionAction(input: TransactionInput) {
  return runAction(async () => {
    const user = await requireUser()
    const data = transactionSchema.parse(input)
    const customerId = await checkLinks(user.businessId, data.customerId, data.quoteId)
    const t = await db.$transaction(async (tx) => {
      const t = await tx.transaction.create({
        data: {
          businessId: user.businessId,
          type: data.type,
          category: data.category,
          amountCents: data.amountCents,
          date: dayToDbDate(data.date),
          description: data.description,
          customerId,
          quoteId: data.quoteId,
          createdById: user.userId,
        },
      })
      if (data.type === "INCOME" && customerId) {
        let detail = `${formatMoney(data.amountCents, user.currency)} ${CATEGORY_LABEL[data.category].toLowerCase()}`
        if (data.quoteId) {
          const [row] = await quoteTotalsFor(user.businessId, { quoteIds: [data.quoteId] })
          // quoteTotalsFor runs outside this tx: add this payment on top of what it sees.
          const paid = (row?.paid ?? 0) + data.amountCents
          detail = `${formatMoney(data.amountCents, user.currency)} for Q-${row?.number}${
            row && paid >= row.total ? ", paid in full" : ""
          }`
        }
        await tx.activity.create({
          data: {
            businessId: user.businessId,
            type: "PAYMENT_RECORDED",
            message: "Payment recorded",
            detail,
            customerId,
            actorId: user.userId,
            entity: "transaction",
            entityId: t.id,
            readAt: new Date(),
          },
        })
      }
      return t
    })
    revalidate(customerId, data.quoteId)
    return { id: t.id }
  })
}

export async function updateTransactionAction(transactionId: string, input: TransactionInput) {
  return runAction(async () => {
    const user = await requireUser()
    const existing = await db.transaction.findFirst({
      where: { id: transactionId, businessId: user.businessId },
    })
    if (!existing) throw new ActionError("That entry no longer exists.")
    const data = transactionSchema.parse(input)
    const customerId = await checkLinks(user.businessId, data.customerId, data.quoteId)
    await db.transaction.update({
      where: { id: existing.id },
      data: {
        type: data.type,
        category: data.category,
        amountCents: data.amountCents,
        date: dayToDbDate(data.date),
        description: data.description,
        customerId,
        quoteId: data.quoteId,
      },
    })
    revalidate(customerId ?? existing.customerId, data.quoteId ?? existing.quoteId)
    return { id: existing.id }
  })
}

/** Owner only (staff can do everything except delete transactions). */
export async function deleteTransactionAction(transactionId: string) {
  return runAction(async () => {
    const user = await requireOwner()
    const t = await db.transaction.findFirst({
      where: { id: transactionId, businessId: user.businessId },
    })
    if (!t) throw new ActionError("That entry no longer exists.")
    await db.transaction.delete({ where: { id: t.id } })
    revalidate(t.customerId, t.quoteId)
    return { description: t.description }
  })
}
