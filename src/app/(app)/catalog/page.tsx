import type { Metadata } from "next"
import { Suspense } from "react"
import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { listCategories, listItems } from "@/features/catalog/queries"
import { CatalogView } from "@/features/catalog/components/catalog-view"

export const metadata: Metadata = { title: "Item catalog" }

export default async function CatalogPage({ searchParams }: PageProps<"/catalog">) {
  const user = await requireUser()
  const sp = await searchParams
  const categoryId = typeof sp.category === "string" ? sp.category : undefined
  const q = typeof sp.q === "string" ? sp.q : undefined

  const [categories, items, all] = await Promise.all([
    listCategories(user.businessId),
    listItems(user.businessId, { categoryId, q }),
    db.catalogItem.findMany({
      where: { businessId: user.businessId },
      select: { name: true, category: { select: { name: true } } },
    }),
  ])

  return (
    <Suspense>
      <CatalogView
        categories={categories}
        items={items}
        allNames={all.map((a) => ({ category: a.category.name, name: a.name }))}
        total={all.length}
        currency={user.currency}
      />
    </Suspense>
  )
}
