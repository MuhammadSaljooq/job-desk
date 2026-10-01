"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { ActionError, runAction } from "@/lib/action"
import { catalogNameKey } from "./sample-catalog"
import { categorySchema, importSchema, itemSchema, type ItemInput } from "./schema"

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0]

/** Find a category by name (case-insensitive) or create it at the end of the list. */
async function categoryByName(tx: Tx, businessId: string, name: string) {
  const found = await tx.catalogCategory.findFirst({
    where: { businessId, name: { equals: name, mode: "insensitive" } },
  })
  if (found) return found
  const max = await tx.catalogCategory.aggregate({
    where: { businessId },
    _max: { sortOrder: true },
  })
  return tx.catalogCategory.create({
    data: { businessId, name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
  })
}

function revalidate() {
  revalidatePath("/catalog")
  revalidatePath("/quotes", "layout")
}

export async function createItemAction(input: ItemInput) {
  return runAction(async () => {
    const user = await requireUser()
    const data = itemSchema.parse(input)
    const item = await db.$transaction(async (tx) => {
      const category = await categoryByName(tx, user.businessId, data.category)
      const nameKey = catalogNameKey(data.name)
      const dup = await tx.catalogItem.findUnique({
        where: { categoryId_nameKey: { categoryId: category.id, nameKey } },
      })
      if (dup) throw new ActionError(`“${data.name}” is already in ${category.name}.`)
      return tx.catalogItem.create({
        data: {
          businessId: user.businessId,
          categoryId: category.id,
          name: data.name,
          nameKey,
          unit: data.unit,
        },
      })
    })
    revalidate()
    return { id: item.id }
  })
}

export async function updateItemAction(itemId: string, input: ItemInput) {
  return runAction(async () => {
    const user = await requireUser()
    const data = itemSchema.parse(input)
    const existing = await db.catalogItem.findFirst({
      where: { id: itemId, businessId: user.businessId },
    })
    if (!existing) throw new ActionError("That item no longer exists.")
    await db.$transaction(async (tx) => {
      const category = await categoryByName(tx, user.businessId, data.category)
      const nameKey = catalogNameKey(data.name)
      const dup = await tx.catalogItem.findUnique({
        where: { categoryId_nameKey: { categoryId: category.id, nameKey } },
      })
      if (dup && dup.id !== existing.id)
        throw new ActionError(`“${data.name}” is already in ${category.name}.`)
      await tx.catalogItem.update({
        where: { id: existing.id },
        data: { name: data.name, nameKey, unit: data.unit, categoryId: category.id },
      })
    })
    revalidate()
    return { id: existing.id }
  })
}

/** Past quotes keep their lines (catalogItemId is cleared), so deleting is safe. */
export async function deleteItemAction(itemId: string) {
  return runAction(async () => {
    const user = await requireUser()
    const item = await db.catalogItem.findFirst({
      where: { id: itemId, businessId: user.businessId },
    })
    if (!item) throw new ActionError("That item no longer exists.")
    await db.catalogItem.delete({ where: { id: item.id } })
    revalidate()
    return { name: item.name }
  })
}

export async function createCategoryAction(name: string) {
  return runAction(async () => {
    const user = await requireUser()
    const data = categorySchema.parse({ name })
    const exists = await db.catalogCategory.findFirst({
      where: { businessId: user.businessId, name: { equals: data.name, mode: "insensitive" } },
    })
    if (exists) throw new ActionError(`There's already a “${exists.name}” category.`)
    const c = await db.$transaction((tx) => categoryByName(tx, user.businessId, data.name))
    revalidate()
    return { id: c.id, name: c.name }
  })
}

export async function renameCategoryAction(categoryId: string, name: string) {
  return runAction(async () => {
    const user = await requireUser()
    const data = categorySchema.parse({ name })
    const c = await db.catalogCategory.findFirst({
      where: { id: categoryId, businessId: user.businessId },
    })
    if (!c) throw new ActionError("That category no longer exists.")
    const clash = await db.catalogCategory.findFirst({
      where: {
        businessId: user.businessId,
        name: { equals: data.name, mode: "insensitive" },
        NOT: { id: c.id },
      },
    })
    if (clash) throw new ActionError(`There's already a “${clash.name}” category.`)
    await db.catalogCategory.update({ where: { id: c.id }, data: { name: data.name } })
    revalidate()
    return { id: c.id }
  })
}

/** Only empty categories can be deleted (move or delete their items first). */
export async function deleteCategoryAction(categoryId: string) {
  return runAction(async () => {
    const user = await requireUser()
    const c = await db.catalogCategory.findFirst({
      where: { id: categoryId, businessId: user.businessId },
      include: { _count: { select: { items: true } } },
    })
    if (!c) throw new ActionError("That category no longer exists.")
    if (c._count.items > 0)
      throw new ActionError(`Move or delete the ${c._count.items} items in ${c.name} first.`)
    await db.catalogCategory.delete({ where: { id: c.id } })
    revalidate()
    return { name: c.name }
  })
}

/**
 * Import previewed rows. The server re-checks everything (the browser preview is only a
 * convenience): validates units and lengths, creates missing categories, skips duplicates
 * already in the catalog or repeated in the file.
 */
export async function importCatalogAction(input: unknown) {
  return runAction(async () => {
    const user = await requireUser()
    const { rows } = importSchema.parse(input)
    const result = await db.$transaction(
      async (tx) => {
        const categories = new Map<string, { id: string }>()
        const existing = await tx.catalogItem.findMany({
          where: { businessId: user.businessId },
          select: { nameKey: true, category: { select: { name: true } } },
        })
        const seen = new Set(
          existing.map((e) => `${catalogNameKey(e.category.name)}::${e.nameKey}`)
        )
        let imported = 0
        let skipped = 0
        for (const r of rows) {
          const key = `${catalogNameKey(r.category)}::${catalogNameKey(r.name)}`
          if (seen.has(key)) {
            skipped++
            continue
          }
          seen.add(key)
          const ck = catalogNameKey(r.category)
          let cat = categories.get(ck)
          if (!cat) {
            cat = await categoryByName(tx, user.businessId, r.category)
            categories.set(ck, cat)
          }
          await tx.catalogItem.create({
            data: {
              businessId: user.businessId,
              categoryId: cat.id,
              name: r.name,
              nameKey: catalogNameKey(r.name),
              unit: r.unit,
            },
          })
          imported++
        }
        return { imported, skipped }
      },
      { timeout: 60_000 }
    )
    revalidate()
    return result
  })
}
