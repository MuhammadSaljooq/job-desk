"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Box, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { EmptyState } from "@/components/shared/empty-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { RowAction } from "@/components/shared/detail-row"
import { StatusPill } from "@/components/shared/status-pill"
import { formatMoney } from "@/lib/money"
import type { CatalogCategoryRow, CatalogItemRow } from "../queries"
import {
  createCategoryAction,
  deleteCategoryAction,
  deleteItemAction,
  renameCategoryAction,
} from "../actions"
import { ImportCard } from "./import-card"
import { ItemDialog, type ItemFormValues } from "./item-dialog"

/** The catalog page (shot-catalog.png): import card, categories, items table. */
export function CatalogView({
  categories,
  items,
  allNames,
  total,
  currency,
}: {
  categories: CatalogCategoryRow[]
  items: CatalogItemRow[]
  /** every item (all categories) for duplicate detection in the import preview */
  allNames: { category: string; name: string }[]
  total: number
  currency: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const [importOpen, setImportOpen] = useState(params.get("import") === "1")
  const [itemOpen, setItemOpen] = useState(false)
  const [editing, setEditing] = useState<(ItemFormValues & { id: string }) | null>(null)
  const [deleting, setDeleting] = useState<CatalogItemRow | null>(null)
  const [deletingCat, setDeletingCat] = useState<CatalogCategoryRow | null>(null)
  const [newCat, setNewCat] = useState("")
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [q, setQ] = useState(params.get("q") ?? "")
  const activeCategory = params.get("category")
  const urlQ = params.get("q") ?? ""

  const replace = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v)
      else sp.delete(k)
    }
    start(() => router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false }))
  }

  useEffect(() => {
    if (q.trim() === urlQ) return
    const t = setTimeout(() => replace({ q: q.trim() || null }), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on text only
  }, [q])

  const catHref = (id: string | null) => {
    const sp = new URLSearchParams(params.toString())
    if (id) sp.set("category", id)
    else sp.delete("category")
    sp.delete("q")
    return sp.size ? `${pathname}?${sp}` : pathname
  }

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newCat.trim()
    if (!name) return
    start(async () => {
      const res = await createCategoryAction(name)
      if (!res.ok) return void toast.error(res.error)
      setNewCat("")
      toast.success(`Added ${res.data.name}`)
      router.refresh()
    })
  }

  const saveRename = (e: React.FormEvent) => {
    e.preventDefault()
    if (!renaming) return
    start(async () => {
      const res = await renameCategoryAction(renaming.id, renaming.name)
      if (!res.ok) return void toast.error(res.error)
      setRenaming(null)
      router.refresh()
    })
  }

  const activeName = categories.find((c) => c.id === activeCategory)?.name

  return (
    <>
      <Breadcrumb title="Item catalog">
        <Button
          variant="secondary"
          onClick={() => setImportOpen((o) => !o)}
          aria-expanded={importOpen}
        >
          <Upload /> Import from Excel
        </Button>
        <Button
          onClick={() => {
            setEditing(null)
            setItemOpen(true)
          }}
        >
          <Plus /> Add item
        </Button>
      </Breadcrumb>

      {importOpen && <ImportCard existing={allNames} onClose={() => setImportOpen(false)} />}

      {total === 0 && !importOpen ? (
        <section className="rounded-card bg-surface">
          <EmptyState
            icon={<Box />}
            title="Your item list is empty"
            description="Import your list from Excel or add items one by one. Prices stay off the list: you type them on each quote."
            action={
              <Button onClick={() => setImportOpen(true)}>
                <Upload /> Import from Excel
              </Button>
            }
          />
        </section>
      ) : (
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[300px_minmax(0,1fr)]">
          <section className="rounded-card bg-surface p-5" aria-labelledby="cat-title">
            <h2 id="cat-title" className="mb-3 text-[16px] font-semibold">
              Categories
            </h2>
            <nav aria-label="Categories" className="flex flex-col gap-0.5">
              <Link
                href={catHref(null)}
                scroll={false}
                aria-current={!activeCategory ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center justify-between rounded-[12px] px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ink",
                  !activeCategory ? "bg-surface-muted font-semibold" : "hover:bg-surface-muted"
                )}
              >
                All items
                <span className="tabular inline-flex min-w-7 justify-center rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-ink-foreground">
                  {total}
                </span>
              </Link>
              {categories.map((c) =>
                renaming?.id === c.id ? (
                  <form
                    key={c.id}
                    onSubmit={saveRename}
                    className="flex items-center gap-1.5 px-1 py-1"
                  >
                    <input
                      autoFocus
                      aria-label="Category name"
                      value={renaming.name}
                      onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                      className="h-8 min-w-0 flex-1 rounded-[10px] bg-surface-muted px-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ink"
                    />
                    <Button size="sm" type="submit" disabled={pending}>
                      Save
                    </Button>
                  </form>
                ) : (
                  <div key={c.id} className="group flex items-center">
                    <Link
                      href={catHref(c.id)}
                      scroll={false}
                      aria-current={activeCategory === c.id ? "page" : undefined}
                      className={cn(
                        "flex h-10 min-w-0 flex-1 items-center justify-between rounded-[12px] px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ink",
                        activeCategory === c.id
                          ? "bg-surface-muted font-semibold"
                          : "hover:bg-surface-muted"
                      )}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="tabular text-[12px] text-text-muted">{c.count}</span>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Options for ${c.name}`}
                        className="ml-0.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-subtle opacity-60 outline-none group-hover:opacity-100 hover:bg-surface-muted focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ink"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onSelect={() => setRenaming({ id: c.id, name: c.name })}>
                          <Pencil /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeletingCat(c)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              )}
            </nav>
            <form onSubmit={addCategory} className="relative mt-3">
              <Plus className="pointer-events-none absolute top-3 left-3.5 size-4 text-text-muted" />
              <input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="New category"
                aria-label="New category"
                maxLength={60}
                className="h-10 w-full rounded-full bg-surface-muted pr-3 pl-9 text-[13px] outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-ink"
              />
            </form>
          </section>

          <section className="min-w-0 rounded-card bg-surface p-5" aria-labelledby="items-title">
            <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="items-title" className="text-[16px] font-semibold">
                {activeName ?? "All items"}
              </h2>
              <label className="relative flex h-10 w-full items-center sm:w-[300px]">
                <span className="sr-only">Search items</span>
                {pending ? (
                  <Loader2 className="pointer-events-none absolute left-3.5 size-4 animate-spin text-text-muted" />
                ) : (
                  <Search className="pointer-events-none absolute left-3.5 size-4 text-text-muted" />
                )}
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search items"
                  className="h-10 w-full rounded-full bg-surface-muted pr-3 pl-10 text-[13px] outline-none placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ink"
                />
              </label>
            </header>
            {items.length === 0 ? (
              <EmptyState
                icon={<Search />}
                title="No items match"
                description={
                  urlQ ? `Nothing for “${urlQ}”.` : "This category is empty. Add an item to it."
                }
              />
            ) : (
              <div className="relative -mx-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-[14px]">
                  <thead>
                    <tr className="text-left text-[12.5px] text-text-muted">
                      <th className="px-3 py-2.5 font-medium">Item</th>
                      <th className="px-3 py-2.5 font-medium">Category</th>
                      <th className="px-3 py-2.5 font-medium">Unit</th>
                      <th className="px-3 py-2.5 text-right font-medium">Times quoted</th>
                      <th className="px-3 py-2.5 text-right font-medium">Last price</th>
                      <th className="w-20 px-3 py-2.5">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id} className="border-t border-divider">
                        <td className="px-3 py-3 font-semibold">{i.name}</td>
                        <td className="px-3 py-3">
                          <StatusPill tone="neutral">{i.category}</StatusPill>
                        </td>
                        <td className="px-3 py-3 text-text-muted">{i.unit}</td>
                        <td className="tabular px-3 py-3 text-right">{i.timesQuoted}</td>
                        <td className="tabular px-3 py-3 text-right">
                          {i.lastPriceCents === null ? (
                            <span className="text-text-subtle">Not yet</span>
                          ) : (
                            formatMoney(i.lastPriceCents, currency)
                          )}
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <RowAction
                            label={`Edit ${i.name}`}
                            onClick={() => {
                              setEditing({
                                id: i.id,
                                name: i.name,
                                category: i.category,
                                unit: i.unit as ItemFormValues["unit"],
                              })
                              setItemOpen(true)
                            }}
                          >
                            <Pencil />
                          </RowAction>
                          <RowAction label={`Delete ${i.name}`} onClick={() => setDeleting(i)}>
                            <Trash2 />
                          </RowAction>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      <ItemDialog
        open={itemOpen}
        onOpenChange={setItemOpen}
        itemId={editing?.id}
        initial={editing ?? (activeName ? { category: activeName } : undefined)}
        categories={categories.map((c) => c.name)}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.name}”?`}
        description="Past quotes keep this line. It just won't be in Quick add any more."
        confirmLabel="Delete item"
        onConfirm={async () => {
          if (!deleting) return
          const res = await deleteItemAction(deleting.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success(`Deleted ${res.data.name}`)
          router.refresh()
        }}
      />
      <ConfirmDialog
        open={!!deletingCat}
        onOpenChange={(o) => !o && setDeletingCat(null)}
        title={`Delete the “${deletingCat?.name}” category?`}
        description={
          deletingCat?.count
            ? `It still has ${deletingCat.count} items. Move or delete them first.`
            : "It's empty, so nothing else changes."
        }
        confirmLabel="Delete category"
        onConfirm={async () => {
          if (!deletingCat) return
          const res = await deleteCategoryAction(deletingCat.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success(`Deleted ${res.data.name}`)
          if (activeCategory === deletingCat.id) router.replace(catHref(null))
          router.refresh()
        }}
      />
    </>
  )
}
