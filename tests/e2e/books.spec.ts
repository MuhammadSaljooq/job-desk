import { readFile } from "node:fs/promises"
import { expect, test } from "@playwright/test"
import { STAFF, expectNoHorizontalScroll, signIn } from "./helpers"

test.describe("bookkeeping", () => {
  test("log, filter, edit, export and delete an expense", async ({ page }) => {
    await signIn(page, undefined, "/books")
    await expect(page.getByRole("heading", { level: 1, name: "Bookkeeping" })).toBeVisible()

    await page.getByRole("button", { name: "Log expense" }).click()
    const dialog = page.getByRole("dialog", { name: "Log expense" })
    await dialog.getByLabel("Amount").fill("42.10")
    await dialog.getByRole("combobox", { name: "Category" }).click()
    await page.getByRole("option", { name: "Fuel & Vehicle" }).click()
    await dialog.getByLabel("Description").fill("E2E fuel run")
    await dialog.getByRole("button", { name: "Log expense" }).click()
    await expect(page.getByText("Expense logged")).toBeVisible()

    const row = page.getByRole("row", { name: /E2E fuel run/ })
    await expect(row).toContainText("−$42.10")
    await expect(row).toContainText("Fuel & Vehicle")
    await expect(page.getByRole("region", { name: "Where the money went" })).toContainText(
      "Fuel & Vehicle"
    )

    // filters live in the URL
    await page.getByRole("link", { name: "Revenue", exact: true }).click()
    await expect(page).toHaveURL(/type=income/)
    await expect(row).toHaveCount(0)
    await page.getByRole("link", { name: "Expenses", exact: true }).click()
    await expect(page).toHaveURL(/type=expense/)
    await expect(row).toBeVisible()

    // edit
    await page.getByRole("button", { name: "Edit E2E fuel run" }).click()
    const edit = page.getByRole("dialog", { name: "Edit entry" })
    await edit.getByLabel("Amount").fill("50")
    await edit.getByRole("button", { name: "Save entry" }).click()
    await expect(page.getByText("Entry saved")).toBeVisible()
    await expect(row).toContainText("−$50.00")

    // export the current view
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Export CSV" }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^jobdesk-expenses-\d{4}-\d{2}\.csv$/)
    const csv = await readFile((await download.path())!, "utf8")
    expect(csv).toContain("Date,Type,Category,Description,Customer,Quote,Amount")
    expect(csv).toContain(",Expense,Fuel & Vehicle,E2E fuel run,,,-50.00")
    expect(csv).not.toContain("Revenue,")

    // delete, with confirmation
    await page.getByRole("button", { name: "Delete E2E fuel run" }).click()
    await page
      .getByRole("dialog", { name: "Delete this entry?" })
      .getByRole("button", { name: "Delete" })
      .click()
    await expect(page.getByText("Entry deleted")).toBeVisible()
    await expect(row).toHaveCount(0)
  })

  test("all time shows the whole ledger with category breakdowns", async ({ page }) => {
    await signIn(page, undefined, "/books?month=all")
    await expect(page.getByRole("button", { name: "Period: All time" })).toBeVisible()
    await expect(page.getByRole("row", { name: /Deposit for Q-1002/ })).toContainText("+$500.00")
    await expect(page.getByRole("row", { name: /Licensed electrician/ })).toContainText("−$300.00")
    const came = page.getByRole("region", { name: "Where it came from" })
    await expect(came).toContainText("Job Payment")
    await expect(came).toContainText("Deposit")
    await expect(page.getByText("Net profit as a share of revenue")).toBeVisible()
  })

  test("staff can edit but not delete", async ({ page }) => {
    await signIn(page, STAFF, "/books?month=all")
    await expect(page.getByRole("button", { name: /^Edit / }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /^Delete / })).toHaveCount(0)
  })

  test("customer payments tab reads from the ledger and records a payment", async ({ page }) => {
    await signIn(page, undefined, "/customers")
    await page
      .getByRole("link", { name: /Oakwood Property Mgmt/ })
      .first()
      .click()
    await page.getByRole("link", { name: /Payments/ }).click()
    await expect(page).toHaveURL(/\/payments$/)
    await expect(page.getByRole("row", { name: /Deposit for Q-1002/ })).toContainText("+$500.00")

    await page.getByRole("button", { name: "Record payment" }).click()
    const pay = page.getByRole("dialog", { name: "Record revenue" })
    await expect(pay.getByRole("combobox", { name: "Customer (optional)" })).toHaveText(
      "Oakwood Property Mgmt"
    )
    await pay.getByLabel("Amount").fill("25")
    await pay.getByLabel("Description").fill("Tip for the crew")
    await pay.getByRole("button", { name: "Record revenue" }).click()
    await expect(page.getByText("Payment recorded")).toBeVisible()
    await expect(page.getByRole("row", { name: /Tip for the crew/ })).toContainText("+$25.00")
  })
})

test("bookkeeping stacks entries on a phone with the amount in view @mobile", async ({ page }) => {
  await signIn(page, undefined, "/books?month=all")
  const entry = page.getByRole("button", { name: "Edit Deposit for Q-1002" })
  await expect(entry).toContainText("+$500.00")
  const box = await entry.boundingBox()
  expect(box && box.x + box.width <= page.viewportSize()!.width).toBe(true)
  await expectNoHorizontalScroll(page)
  await entry.click()
  await expect(page.getByRole("dialog", { name: "Edit entry" })).toBeVisible()
})
