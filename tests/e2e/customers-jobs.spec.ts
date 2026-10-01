import { expect, test } from "@playwright/test"
import { STAFF, expectNoHorizontalScroll, signIn } from "./helpers"

test.describe("customers and jobs", () => {
  test("create a customer, add a job, move it to Completed", async ({ page }) => {
    await signIn(page, undefined, "/customers")
    await page.getByRole("button", { name: "Customer", exact: true }).click()
    const dialog = page.getByRole("dialog", { name: "New customer" })
    await dialog.getByRole("button", { name: "Add customer" }).click()
    await expect(dialog.getByText("Enter a name or company")).toBeVisible()
    await dialog.getByLabel("Name or company").fill("Test Customer E2E")
    await dialog.getByLabel("Phone").fill("(555) 010-2030")
    await dialog.getByLabel("Email").fill("e2e@example.com")
    await dialog.getByLabel("Job site address").fill("1 Test Street")
    await dialog.getByRole("button", { name: "Add customer" }).click()
    await expect(dialog).toBeHidden()

    // lands on the new profile
    await expect(page.getByRole("heading", { level: 1, name: "Test Customer E2E" })).toBeVisible()
    await expect(page.getByText("No jobs for this customer yet")).toBeVisible()

    // add a job from the strip "+"
    await page.getByRole("button", { name: "Add job" }).first().click()
    const job = page.getByRole("dialog", { name: "New job" })
    await job.getByLabel("Job title").fill("Mount bedroom TV")
    await job.getByLabel("Category").fill("TV & Mounting")
    await job.getByLabel("Date").fill("2026-12-03")
    await job.getByLabel("Time").fill("10:30")
    await job.getByRole("button", { name: /Jordan/ }).click()
    await job.getByRole("button", { name: "Add job" }).click()
    await expect(page.getByText("Added Mount bedroom TV")).toBeVisible()
    await expect(job).toBeHidden()

    const row = page.locator("li[id^=job-]", { hasText: "Mount bedroom TV" })
    await expect(row).toContainText("Thu, Dec 3 · 10:30 am")
    await expect(row.getByRole("combobox", { name: /Stage for Mount bedroom TV/ })).toHaveText(
      /Lead/
    )

    // move it to Completed with the inline stage select
    await row.getByRole("combobox", { name: /Stage for Mount bedroom TV/ }).click()
    await page.getByRole("option", { name: "Completed" }).click()
    await expect(page.getByText("Mount bedroom TV moved to Completed")).toBeVisible()
    await page.reload()
    await expect(
      page
        .locator("li[id^=job-]", { hasText: "Mount bedroom TV" })
        .getByRole("combobox", { name: /Stage for/ })
    ).toHaveText(/Completed/)
    // the stage change is in the notes feed
    await expect(page.getByText("Job completed")).toBeVisible()
  })

  test("search, filter and edit", async ({ page }) => {
    await signIn(page, undefined, "/customers")
    await page.getByPlaceholder("Search name, phone or address").fill("maple")
    await expect(page).toHaveURL(/q=maple/)
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Sarah Mitchell"])
    await page.getByPlaceholder("Search name, phone or address").fill("")
    await expect(page).not.toHaveURL(/q=/)

    await page.getByRole("button", { name: /Filter:/ }).click()
    await page.getByRole("menuitem", { name: "Owes money" }).click()
    await expect(page).toHaveURL(/filter=owes/)
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "David Chen",
      "Oakwood Property Mgmt",
    ])

    await page.getByRole("link", { name: "David Chen", exact: true }).click()
    await page.getByRole("button", { name: "Edit details" }).first().click()
    const dialog = page.getByRole("dialog", { name: "Edit customer" })
    await dialog.getByLabel("Access notes").fill("Buzz 4B, service elevator")
    await dialog.getByRole("button", { name: "Save changes" }).click()
    await expect(page.getByText("Buzz 4B, service elevator")).toBeVisible()
  })

  test("+ New > New job lets you pick the customer", async ({ page }) => {
    await signIn(page)
    await page.getByRole("button", { name: "New", exact: true }).click()
    await page.getByRole("menuitem", { name: "New job" }).click()
    const job = page.getByRole("dialog", { name: "New job" })
    await job.getByRole("combobox", { name: "Customer" }).click()
    await page.getByRole("option", { name: "Priya Patel" }).click()
    await job.getByLabel("Job title").fill("Bookshelf anchoring")
    await job.getByRole("button", { name: "Add job" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Priya Patel" })).toBeVisible()
    await expect(page.locator("li[id^=job-]", { hasText: "Bookshelf anchoring" })).toBeVisible()
  })

  test("staff can't delete customers", async ({ page }) => {
    await signIn(page, STAFF, "/customers")
    await page.getByRole("button", { name: "Options for Sarah Mitchell" }).click()
    await expect(page.getByRole("menuitem", { name: "Open profile" })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: "Delete customer" })).toHaveCount(0)
  })
})

test("customer profile works on a phone @mobile", async ({ page }) => {
  await signIn(page, undefined, "/customers")
  await page.getByRole("link", { name: "Sarah Mitchell", exact: true }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Sarah Mitchell" })).toBeVisible()
  await expect(page.getByRole("link", { name: /Hallway drywall and paint/ }).first()).toBeVisible()
  await expectNoHorizontalScroll(page)
})
