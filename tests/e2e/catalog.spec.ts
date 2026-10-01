import path from "node:path"
import { expect, test } from "@playwright/test"
import { expectNoHorizontalScroll, signIn } from "./helpers"

const XLSX_FILE = path.resolve("tests/fixtures/catalog-sample.xlsx")

test.describe("item catalog", () => {
  test("import from an .xlsx file with a preview, skipping duplicates", async ({ page }) => {
    await signIn(page, undefined, "/catalog")
    await expect(page.getByRole("link", { name: /All items\s*44/ })).toBeVisible()
    await page.getByRole("button", { name: "Import from Excel" }).click()
    await page.getByLabel("Upload a spreadsheet").setInputFiles(XLSX_FILE)
    const preview = page.getByRole("table", { name: "Import preview" })
    await expect(preview).toBeVisible()
    await expect(
      page.getByText("38 new · 2 duplicate · 0 invalid · header row detected")
    ).toBeVisible()
    await page.getByRole("button", { name: "Import 38 items" }).click()
    await expect(page.getByText("Imported 38 items, skipped 2 duplicates")).toBeVisible()
    await expect(page.getByRole("link", { name: /All items\s*82/ })).toBeVisible()
    await expect(page.getByRole("link", { name: /Outdoor & Yard\s*8/ })).toBeVisible()
  })

  test("paste rows copied from Excel, invalid rows are shown and left out", async ({ page }) => {
    await signIn(page, undefined, "/catalog?import=1")
    await page
      .getByLabel("Or paste rows copied from Excel")
      .fill(
        "Category\tItem\tUnit\nPainting\tCabinet Painting\troom\nPainting\tFence Painting\tbucket\n"
      )
    await expect(page.getByText("1 new · 0 duplicate · 1 invalid")).toBeVisible()
    await expect(page.getByText(/Unknown unit “bucket”/)).toBeVisible()
    await page.getByRole("button", { name: "Import 1 item" }).click()
    await expect(page.getByText("Imported 1 item, 1 invalid")).toBeVisible()
  })

  test("add, edit, search and delete an item; categories", async ({ page }) => {
    await signIn(page, undefined, "/catalog")
    await page.getByRole("button", { name: "Add item" }).click()
    const dialog = page.getByRole("dialog", { name: "Add item" })
    await dialog.getByLabel("Item or service").fill("Attic Ladder Install")
    await dialog.getByLabel("Category").fill("Carpentry Extras")
    await dialog.getByRole("combobox", { name: "Unit" }).click()
    await page.getByRole("option", { name: "set" }).click()
    await dialog.getByRole("button", { name: "Add item" }).click()
    await expect(page.getByText("Added Attic Ladder Install")).toBeVisible()
    await expect(page.getByRole("link", { name: /Carpentry Extras\s*1/ })).toBeVisible()

    await page.getByPlaceholder("Search items").fill("attic")
    await expect(page).toHaveURL(/q=attic/)
    const row = page.getByRole("row", { name: /Attic Ladder Install/ })
    await expect(row).toContainText("set")
    await expect(row).toContainText("Not yet")

    await row.getByRole("button", { name: "Edit Attic Ladder Install" }).click()
    const edit = page.getByRole("dialog", { name: "Edit item" })
    await edit.getByLabel("Item or service").fill("Attic Ladder Install (folding)")
    await edit.getByRole("button", { name: "Save item" }).click()
    await expect(page.getByText("Item saved")).toBeVisible()

    await page.getByPlaceholder("Search items").fill("folding")
    await page.getByRole("button", { name: "Delete Attic Ladder Install (folding)" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Delete item" }).click()
    await expect(page.getByText("Deleted Attic Ladder Install (folding)")).toBeVisible()

    // the now-empty category can be deleted
    await page.getByPlaceholder("Search items").fill("")
    await page.getByRole("button", { name: "Options for Carpentry Extras" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Delete category" }).click()
    await expect(page.getByText("Deleted Carpentry Extras")).toBeVisible()
  })
})

test("catalog fits a phone @mobile", async ({ page }) => {
  await signIn(page, undefined, "/catalog")
  await expect(page.getByRole("heading", { level: 1, name: "Item catalog" })).toBeVisible()
  await expectNoHorizontalScroll(page)
})
