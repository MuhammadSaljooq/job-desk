import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import {
  createCategoryAction,
  createItemAction,
  deleteCategoryAction,
  deleteItemAction,
  importCatalogAction,
  renameCategoryAction,
  updateItemAction,
} from "@/features/catalog/actions"
import { listCategories, listItems } from "@/features/catalog/queries"
import { seedSampleRecords } from "@/features/settings/sample-data"
import { createBusiness, resetDb, signInAs } from "./helpers"

beforeEach(resetDb)
afterEach(() => signInAs(null))

describe("catalog", () => {
  it("adds, edits and deletes items; categories are created on the fly", async () => {
    const { business, jordan } = await createBusiness()
    signInAs(jordan) // staff can manage the catalog
    const res = await createItemAction({
      name: "Smart Lock Install",
      category: "Security",
      unit: "each",
    })
    expect(res.ok).toBe(true)
    const dup = await createItemAction({
      name: "smart lock install ",
      category: "security",
      unit: "each",
    })
    expect(dup).toEqual({ ok: false, error: "“smart lock install” is already in Security." })
    const id = res.ok ? res.data.id : ""
    expect(
      (
        await updateItemAction(id, {
          name: "Smart Lock Install",
          category: "Electrical",
          unit: "set",
        })
      ).ok
    ).toBe(true)
    const item = await db.catalogItem.findUniqueOrThrow({
      where: { id },
      include: { category: true },
    })
    expect(item).toMatchObject({ unit: "set", category: { name: "Electrical" } })
    expect((await listCategories(business.id)).map((c) => [c.name, c.count])).toEqual([
      ["Security", 0],
      ["Electrical", 1],
    ])
    expect(await deleteItemAction(id)).toEqual({ ok: true, data: { name: "Smart Lock Install" } })
    expect((await createItemAction({ name: "X", category: "C", unit: "bucket" as never })).ok).toBe(
      false
    )
  })

  it("manages categories and refuses to delete non-empty ones", async () => {
    const { owner } = await createBusiness()
    signInAs(owner)
    const c = await createCategoryAction("Outdoor")
    expect(c.ok).toBe(true)
    expect((await createCategoryAction("outdoor")).ok).toBe(false)
    const id = c.ok ? c.data.id : ""
    expect((await renameCategoryAction(id, "Outdoor & Yard")).ok).toBe(true)
    await createItemAction({
      name: "Gutter Cleaning",
      category: "Outdoor & Yard",
      unit: "linear ft",
    })
    expect(await deleteCategoryAction(id)).toEqual({
      ok: false,
      error: "Move or delete the 1 items in Outdoor & Yard first.",
    })
  })

  it("imports rows, skipping duplicates from the catalog and the file", async () => {
    const { business, owner, jordan, alex } = await createBusiness()
    await seedSampleRecords(db, {
      businessId: business.id,
      timezone: business.timezone,
      today: "2026-09-29",
      team: { ownerId: owner.id, jordanId: jordan.id, alexId: alex.id },
    })
    signInAs(owner)
    const res = await importCatalogAction({
      rows: [
        { category: "Electrical", name: "Light Fixture Install", unit: "each" }, // already there
        { category: "Electrical", name: "EV Charger Prep", unit: "each" },
        { category: "Outdoor", name: "Gutter Cleaning", unit: "linear ft" },
        { category: "outdoor", name: "gutter cleaning", unit: "linear ft" }, // repeated in file
      ],
    })
    expect(res).toEqual({ ok: true, data: { imported: 2, skipped: 2 } })
    expect(await db.catalogItem.count({ where: { businessId: business.id } })).toBe(46)
    expect(
      await db.catalogCategory.count({ where: { businessId: business.id, name: "Outdoor" } })
    ).toBe(1)
    // the server re-validates rows; a bad unit fails the whole import
    expect(
      (await importCatalogAction({ rows: [{ category: "A", name: "B", unit: "bucket" }] })).ok
    ).toBe(false)
    expect((await importCatalogAction({ rows: [] })).ok).toBe(false)
  })

  it("computes times quoted and the last price from quote lines", async () => {
    const { business, owner, jordan, alex } = await createBusiness()
    await seedSampleRecords(db, {
      businessId: business.id,
      timezone: business.timezone,
      today: "2026-09-29",
      team: { ownerId: owner.id, jordanId: jordan.id, alexId: alex.id },
    })
    const items = await listItems(business.id)
    const by = (n: string) => items.find((i) => i.name === n)!
    // on Q-1001 and Q-1004, priced 149 both times
    expect(by("TV Wall Mount (Full Motion)")).toMatchObject({
      timesQuoted: 2,
      lastPriceCents: 14900,
    })
    // on Q-1006 only, but unpriced there
    expect(by("Ceiling Fan Install")).toMatchObject({ timesQuoted: 1, lastPriceCents: null })
    // newest priced quote wins: Q-1006 (today) over Q-1001
    expect(by("Mounting Hardware Kit")).toMatchObject({ timesQuoted: 2, lastPriceCents: 3500 })
    expect(by("Drywall Sheets")).toMatchObject({ timesQuoted: 0, lastPriceCents: null })
    expect(await listItems(business.id, { q: "drywall" })).toHaveLength(3)
  })

  it("never lets one business touch another's catalog", async () => {
    const a = await createBusiness()
    const b = await createBusiness()
    signInAs(b.owner)
    const theirs = await createItemAction({ name: "Theirs", category: "B", unit: "each" })
    signInAs(a.owner)
    const id = theirs.ok ? theirs.data.id : ""
    expect((await deleteItemAction(id)).ok).toBe(false)
    expect((await updateItemAction(id, { name: "Hacked", category: "B", unit: "each" })).ok).toBe(
      false
    )
  })
})
