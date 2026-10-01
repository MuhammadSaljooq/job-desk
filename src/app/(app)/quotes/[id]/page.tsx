import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { dayInZone, dbDateToDay } from "@/lib/dates"
import { listCategories, listItems } from "@/features/catalog/queries"
import { getQuoteForBuilder } from "@/features/quotes/queries"
import { QuoteBuilder } from "@/features/quotes/components/quote-builder"

export async function generateMetadata({ params }: PageProps<"/quotes/[id]">): Promise<Metadata> {
  const user = await requireUser()
  const { id } = await params
  const q = await db.quote.findFirst({
    where: { id, businessId: user.businessId },
    select: { number: true },
  })
  return { title: q ? `Q-${q.number}` : "Quote" }
}

export default async function QuotePage({ params }: PageProps<"/quotes/[id]">) {
  const user = await requireUser()
  const { id } = await params
  const data = await getQuoteForBuilder(user.businessId, id)
  if (!data) notFound()
  const { quote: q, paid } = data

  const [items, categories, customers, jobs] = await Promise.all([
    listItems(user.businessId),
    listCategories(user.businessId),
    db.customer.findMany({
      where: { businessId: user.businessId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.job.findMany({
      where: { businessId: user.businessId },
      select: { id: true, title: true, customerId: true },
      orderBy: { createdAt: "desc" },
    }),
  ])
  const jobsByCustomer: Record<string, { id: string; title: string }[]> = {}
  for (const j of jobs) (jobsByCustomer[j.customerId] ??= []).push({ id: j.id, title: j.title })

  return (
    <QuoteBuilder
      // remount with fresh state after status changes / reloads
      key={`${q.id}:${q.status}`}
      quote={{
        id: q.id,
        number: q.number,
        status: q.status,
        version: q.updatedAt.toISOString(),
        customerId: q.customerId,
        jobId: q.jobId,
        title: q.title ?? "",
        date: dbDateToDay(q.date),
        taxRateBps: q.taxRateBps,
        discountCents: q.discountCents,
        notes: q.notes ?? "",
        paid,
        lines: q.lines.map((l) => ({
          catalogItemId: l.catalogItemId,
          name: l.name,
          category: l.category,
          unit: l.unit,
          qty: l.qty.toString(),
          unitPriceCents: l.unitPriceCents,
        })),
      }}
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        unit: i.unit,
        lastPriceCents: i.lastPriceCents,
      }))}
      categories={categories.filter((c) => c.count > 0).map((c) => c.name)}
      customers={customers}
      jobsByCustomer={jobsByCustomer}
      currency={user.currency}
      today={dayInZone(new Date(), user.timezone)}
    />
  )
}
