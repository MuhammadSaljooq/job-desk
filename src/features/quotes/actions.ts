"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser, type CurrentUser } from "@/lib/auth"
import { ActionError, runAction } from "@/lib/action"
import { dayInZone, dayToDbDate } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { quoteTotals } from "./totals"
import { createQuoteSchema, isEditable, quoteSaveSchema, type QuoteSaveInput } from "./schema"

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0]

function revalidate(quoteId?: string, customerId?: string) {
  revalidatePath("/quotes")
  if (quoteId) revalidatePath(`/quotes/${quoteId}`)
  if (customerId) revalidatePath(`/customers/${customerId}`, "layout")
  revalidatePath("/")
  revalidatePath("/catalog")
}

async function ownQuote(tx: Tx | typeof db, businessId: string, quoteId: unknown) {
  if (typeof quoteId !== "string" || !quoteId) throw new ActionError("Quote not found.")
  const q = await tx.quote.findFirst({
    where: { id: quoteId, businessId },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      customer: { select: { id: true, name: true } },
      job: { select: { id: true, title: true, stage: true } },
    },
  })
  if (!q) throw new ActionError("That quote no longer exists.")
  return q
}

async function checkCustomerJob(
  tx: Tx | typeof db,
  businessId: string,
  customerId: string,
  jobId: string | null
) {
  const c = await tx.customer.findFirst({
    where: { id: customerId, businessId },
    select: { id: true },
  })
  if (!c) throw new ActionError("That customer no longer exists.")
  if (jobId) {
    const j = await tx.job.findFirst({
      where: { id: jobId, businessId, customerId },
      select: { id: true },
    })
    if (!j) throw new ActionError("That job isn't on this customer.")
  }
}

/**
 * New draft. The number comes from Business.nextQuoteNumber, incremented in the same
 * transaction, so two people creating quotes at once never get the same number (D7).
 */
export async function createQuote(user: CurrentUser, input: unknown) {
  const data = createQuoteSchema.parse(input)
  return db.$transaction(async (tx) => {
    await checkCustomerJob(tx, user.businessId, data.customerId, data.jobId)
    const business = await tx.business.update({
      where: { id: user.businessId },
      data: { nextQuoteNumber: { increment: 1 } },
      select: { nextQuoteNumber: true, taxRateBps: true, quoteFooter: true },
    })
    const job = data.jobId
      ? await tx.job.findUnique({ where: { id: data.jobId }, select: { title: true } })
      : null
    return tx.quote.create({
      data: {
        businessId: user.businessId,
        customerId: data.customerId,
        jobId: data.jobId,
        number: business.nextQuoteNumber - 1,
        title: job?.title ?? null,
        date: dayToDbDate(dayInZone(new Date(), user.timezone)),
        status: "DRAFT",
        taxRateBps: business.taxRateBps,
        footer: business.quoteFooter,
      },
      select: { id: true, number: true, customerId: true },
    })
  })
}

export async function createQuoteAction(input: { customerId: string; jobId?: string | null }) {
  return runAction(async () => {
    const user = await requireUser()
    const q = await createQuote(user, input)
    revalidate(q.id, q.customerId)
    return q
  })
}

/** Autosave from the builder. Replaces header + lines; refuses stale versions. */
export async function saveQuoteAction(quoteId: string, input: QuoteSaveInput) {
  return runAction(async () => {
    const user = await requireUser()
    const data = quoteSaveSchema.parse(input)
    const saved = await db.$transaction(async (tx) => {
      const q = await ownQuote(tx, user.businessId, quoteId)
      if (!isEditable(q.status))
        throw new ActionError("Accepted and declined quotes can't be edited. Reopen it first.")
      if (q.updatedAt.toISOString() !== data.version) {
        throw new ActionError(
          "This quote was changed somewhere else. Reload to see the latest version."
        )
      }
      await checkCustomerJob(tx, user.businessId, data.customerId, data.jobId)
      // Only keep catalog links that point at this business's items.
      const ids = [
        ...new Set(data.lines.map((l) => l.catalogItemId).filter((v): v is string => !!v)),
      ]
      const valid = new Set(
        ids.length
          ? (
              await tx.catalogItem.findMany({
                where: { businessId: user.businessId, id: { in: ids } },
                select: { id: true },
              })
            ).map((i) => i.id)
          : []
      )
      await tx.quoteLine.deleteMany({ where: { quoteId: q.id } })
      if (data.lines.length) {
        await tx.quoteLine.createMany({
          data: data.lines.map((l, i) => ({
            businessId: user.businessId,
            quoteId: q.id,
            catalogItemId: l.catalogItemId && valid.has(l.catalogItemId) ? l.catalogItemId : null,
            name: l.name,
            category: l.category,
            unit: l.unit,
            qty: Math.round(l.qty * 100) / 100,
            unitPriceCents: l.unitPriceCents,
            sortOrder: i,
          })),
        })
      }
      return tx.quote.update({
        where: { id: q.id },
        data: {
          customerId: data.customerId,
          jobId: data.jobId,
          title: data.title,
          date: dayToDbDate(data.date),
          taxRateBps: data.taxRateBps,
          discountCents: data.discountCents,
          notes: data.notes,
        },
        select: { id: true, updatedAt: true, customerId: true },
      })
    })
    revalidate(saved.id, saved.customerId)
    return { version: saved.updatedAt.toISOString() }
  })
}

function assertSendable(lines: { unitPriceCents: number | null }[]) {
  if (lines.length === 0) throw new ActionError("Add at least one line first.")
  const unpriced = lines.filter((l) => l.unitPriceCents === null).length
  if (unpriced)
    throw new ActionError(`Enter a price for ${unpriced} item${unpriced === 1 ? "" : "s"} first.`)
}

function totalOf(q: {
  lines: { qty: unknown; unitPriceCents: number | null }[]
  taxRateBps: number
  discountCents: number
}) {
  return quoteTotals(
    q.lines.map((l) => ({ qty: String(l.qty), unitPriceCents: l.unitPriceCents })),
    { taxRateBps: q.taxRateBps, discountCents: q.discountCents }
  ).total
}

/** Draft -> Sent. Dylan sends the PDF himself (D5); this only records it. */
export async function markSentAction(quoteId: string) {
  return runAction(async () => {
    const user = await requireUser()
    const q = await db.$transaction(async (tx) => {
      const q = await ownQuote(tx, user.businessId, quoteId)
      if (q.status !== "DRAFT") throw new ActionError("Only drafts can be marked as sent.")
      assertSendable(q.lines)
      await tx.quote.update({ where: { id: q.id }, data: { status: "SENT", sentAt: new Date() } })
      if (q.job?.stage === "LEAD")
        await tx.job.update({ where: { id: q.job.id }, data: { stage: "QUOTED" } })
      await tx.activity.create({
        data: {
          businessId: user.businessId,
          type: "QUOTE_SENT",
          message: `Quote Q-${q.number} sent`,
          detail: `${q.title ?? "Quote"}, ${formatMoney(totalOf(q), user.currency)}`,
          customerId: q.customerId,
          actorId: user.userId,
          entity: "quote",
          entityId: q.id,
          readAt: new Date(),
        },
      })
      return q
    })
    revalidate(q.id, q.customerId)
    return { status: "SENT" as const }
  })
}

export async function declineQuoteAction(quoteId: string) {
  return runAction(async () => {
    const user = await requireUser()
    const q = await db.$transaction(async (tx) => {
      const q = await ownQuote(tx, user.businessId, quoteId)
      if (!isEditable(q.status))
        throw new ActionError("Only drafts and sent quotes can be declined.")
      await tx.quote.update({
        where: { id: q.id },
        data: { status: "DECLINED", declinedAt: new Date() },
      })
      await tx.activity.create({
        data: {
          businessId: user.businessId,
          type: "QUOTE_DECLINED",
          message: `Quote Q-${q.number} declined`,
          detail: q.title ?? q.customer.name,
          customerId: q.customerId,
          actorId: user.userId,
          entity: "quote",
          entityId: q.id,
          readAt: new Date(),
        },
      })
      return q
    })
    revalidate(q.id, q.customerId)
    return { status: "DECLINED" as const }
  })
}

/** Declined -> Draft. */
export async function reopenQuoteAction(quoteId: string) {
  return runAction(async () => {
    const user = await requireUser()
    const q = await ownQuote(db, user.businessId, quoteId)
    if (q.status !== "DECLINED") throw new ActionError("Only declined quotes can be reopened.")
    await db.quote.update({
      where: { id: q.id },
      data: { status: "DRAFT", declinedAt: null, sentAt: null },
    })
    revalidate(q.id, q.customerId)
    return { status: "DRAFT" as const }
  })
}

/**
 * Accept: creates a SCHEDULED job when none is linked, or moves a linked Lead / Quoted job to
 * Scheduled. Writes Activity. Blocked while any line is unpriced (D6).
 */
export async function acceptQuoteAction(quoteId: string) {
  return runAction(async () => {
    const user = await requireUser()
    const result = await db.$transaction(async (tx) => {
      const q = await ownQuote(tx, user.businessId, quoteId)
      if (!isEditable(q.status))
        throw new ActionError("This quote is already accepted or declined.")
      assertSendable(q.lines)
      let jobId = q.job?.id ?? null
      let jobCreated = false
      if (!q.job) {
        const job = await tx.job.create({
          data: {
            businessId: user.businessId,
            customerId: q.customerId,
            title: q.title ?? `Q-${q.number}`,
            category: q.lines.find((l) => l.category)?.category ?? null,
            stage: "SCHEDULED",
            notes: `From quote Q-${q.number}`,
          },
        })
        jobId = job.id
        jobCreated = true
      } else if (q.job.stage === "LEAD" || q.job.stage === "QUOTED") {
        await tx.job.update({ where: { id: q.job.id }, data: { stage: "SCHEDULED" } })
      }
      await tx.quote.update({
        where: { id: q.id },
        data: { status: "ACCEPTED", acceptedAt: new Date(), jobId, sentAt: q.sentAt ?? new Date() },
      })
      await tx.activity.create({
        data: {
          businessId: user.businessId,
          type: "QUOTE_ACCEPTED",
          message: `Quote Q-${q.number} accepted`,
          detail: `${q.customer.name} accepted ${q.title ?? "the quote"}, ${formatMoney(totalOf(q), user.currency)}`,
          customerId: q.customerId,
          actorId: user.userId,
          entity: "quote",
          entityId: q.id,
          readAt: new Date(),
        },
      })
      return { q, jobId: jobId!, jobCreated }
    })
    revalidate(result.q.id, result.q.customerId)
    revalidatePath("/calendar")
    return { jobId: result.jobId, jobCreated: result.jobCreated, number: result.q.number }
  })
}

/** Only drafts can be deleted (sent quotes are a record of what the customer saw). */
export async function deleteQuoteAction(quoteId: string) {
  return runAction(async () => {
    const user = await requireUser()
    const q = await ownQuote(db, user.businessId, quoteId)
    if (q.status !== "DRAFT")
      throw new ActionError("Only drafts can be deleted. Decline the quote instead.")
    await db.quote.delete({ where: { id: q.id } })
    revalidate(undefined, q.customerId)
    return { number: q.number }
  })
}
