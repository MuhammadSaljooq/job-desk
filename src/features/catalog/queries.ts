import "server-only"
import { db } from "@/lib/db"

export type CatalogCategoryRow = { id: string; name: string; count: number }
export type CatalogItemRow = {
  id: string
  name: string
  unit: string
  categoryId: string
  category: string
  timesQuoted: number
  /** the price typed on the most recent quote that priced this item (cents) */
  lastPriceCents: number | null
}

export async function listCategories(businessId: string): Promise<CatalogCategoryRow[]> {
  const rows = await db.catalogCategory.findMany({
    where: { businessId },
    select: { id: true, name: true, _count: { select: { items: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })
  return rows.map((r) => ({ id: r.id, name: r.name, count: r._count.items }))
}

/**
 * Items with "times quoted" (distinct quotes) and "last price quoted", both computed from
 * QuoteLine in SQL. The catalog itself stores no prices.
 */
export async function listItems(
  businessId: string,
  opts: { categoryId?: string; q?: string } = {}
): Promise<CatalogItemRow[]> {
  const items = await db.catalogItem.findMany({
    where: {
      businessId,
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.q?.trim()
        ? { name: { contains: opts.q.trim(), mode: "insensitive" as const } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      unit: true,
      categoryId: true,
      category: { select: { name: true, sortOrder: true } },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  })
  if (!items.length) return []
  const stats = await quoteStats(
    businessId,
    items.map((i) => i.id)
  )
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    categoryId: i.categoryId,
    category: i.category.name,
    timesQuoted: stats.get(i.id)?.times ?? 0,
    lastPriceCents: stats.get(i.id)?.last ?? null,
  }))
}

/** Per catalog item: distinct quotes it appears on, and the latest typed price. */
export async function quoteStats(businessId: string, itemIds: string[]) {
  const map = new Map<string, { times: number; last: number | null }>()
  if (!itemIds.length) return map
  const times = await db.$queryRaw<{ id: string; times: bigint }[]>`
    SELECT l."catalogItemId" AS id, COUNT(DISTINCT l."quoteId") AS times
    FROM "QuoteLine" l
    WHERE l."businessId" = ${businessId} AND l."catalogItemId" = ANY(${itemIds})
    GROUP BY l."catalogItemId"`
  const last = await db.$queryRaw<{ id: string; price: number }[]>`
    SELECT DISTINCT ON (l."catalogItemId") l."catalogItemId" AS id, l."unitPriceCents" AS price
    FROM "QuoteLine" l JOIN "Quote" q ON q.id = l."quoteId"
    WHERE l."businessId" = ${businessId} AND l."catalogItemId" = ANY(${itemIds})
      AND l."unitPriceCents" IS NOT NULL
    ORDER BY l."catalogItemId", q.date DESC, q.number DESC`
  for (const t of times) map.set(t.id, { times: Number(t.times), last: null })
  for (const l of last) map.set(l.id, { times: map.get(l.id)?.times ?? 0, last: l.price })
  return map
}
