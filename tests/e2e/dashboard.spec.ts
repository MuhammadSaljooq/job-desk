import { expect, test } from "@playwright/test"
import { expectNoHorizontalScroll, signIn } from "./helpers"

test.describe("dashboard", () => {
  test("shows every card, and today's jobs open in the day sheet", async ({ page }) => {
    await signIn(page)
    await expect(
      page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening), / })
    ).toBeVisible()
    for (const name of [
      "This month",
      "Activity",
      "Job pipeline",
      "Money in and out",
      "Latest job site photos",
    ]) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
    }
    await expect(page.getByText("Owner dashboard")).toBeVisible()
    // the overdue turnover is the first ongoing card
    await expect(
      page.getByRole("link", { name: "Unit 12 turnover repairs, overdue" })
    ).toBeVisible()
    await expect(page.getByText("$480.60 across 1 quote")).toBeVisible()

    await page.getByRole("link", { name: /\d+ jobs? today/ }).click()
    await expect(page).toHaveURL(/day=\d{4}-\d{2}-\d{2}/)
    const sheet = page.getByRole("dialog")
    await expect(sheet).toContainText("Today")
    await expect(sheet.getByRole("link", { name: /Bedroom TV mount/ })).toBeVisible()
    await expect(sheet.getByRole("link", { name: /Kitchen faucet and disposal/ })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page).not.toHaveURL(/day=/)
  })

  test("the job filter drives the strip and the calendar", async ({ page }) => {
    await signIn(page)
    // other specs add jobs, so compare the summary before and after instead of fixed counts
    const active = page.getByText(/^\d+ jobs?, \d+ scheduled$/)
    const before = await active.textContent()
    await page.getByRole("button", { name: "Show: All jobs" }).click()
    await page.getByRole("menuitem", { name: "In progress" }).click()
    await expect(page).toHaveURL(/jobs=in_progress/)
    await expect(page.getByRole("link", { name: "Bedroom TV mount, In progress" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Kitchen faucet and disposal, Lead" })).toHaveCount(
      0
    )
    // the summary is about the business, not the filter
    await expect(active).toHaveText(before!)
  })

  test("summary rows open the filtered pages", async ({ page }) => {
    await signIn(page)
    await page.getByRole("link", { name: /^Revenue/ }).click()
    await expect(page).toHaveURL(/\/books\?month=\d{4}-\d{2}&type=income/)
    await expect(page.getByRole("link", { name: "Revenue", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  test("change a stage from the pipeline board", async ({ page }) => {
    await signIn(page)
    const board = page.getByRole("region", { name: "Job pipeline" })
    await board.getByRole("combobox", { name: /Stage for Floating shelves in living room/ }).click()
    await page.getByRole("option", { name: "Quoted" }).click()
    await expect(page.getByText("Floating shelves in living room moved to Quoted")).toBeVisible()
    await expect(board.getByRole("region", { name: /^Quoted, \d+$/ })).toContainText(
      "Floating shelves in living room"
    )
    // put it back for the other specs
    await board.getByRole("combobox", { name: /Stage for Floating shelves in living room/ }).click()
    await page.getByRole("option", { name: "Lead" }).click()
    await expect(board.getByRole("region", { name: /^Lead, \d+$/ })).toContainText(
      "Floating shelves in living room"
    )
  })

  test("the rail calendar lists a day's jobs", async ({ page }) => {
    await signIn(page, undefined, "/calendar")
    await expect(page.getByRole("heading", { name: "All jobs" })).toBeVisible()
    await page.getByRole("gridcell", { name: /\(today\)/ }).click()
    await expect(page).toHaveURL(/\/calendar\?day=/)
    await expect(
      page.getByRole("dialog").getByRole("link", { name: /Bedroom TV mount/ })
    ).toBeVisible()
  })
})

test("the dashboard fits a phone @mobile", async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole("heading", { name: "Job pipeline" })).toBeVisible()
  await expectNoHorizontalScroll(page)
})
