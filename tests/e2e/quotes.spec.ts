import { expect, test, type Page } from "@playwright/test"
import { expectNoHorizontalScroll, signIn } from "./helpers"

async function waitSaved(page: Page) {
  await expect(page.getByTestId("save-state")).toHaveText(/Saved/, { timeout: 15_000 })
}

test.describe("fast quotes", () => {
  test("build a quote from the catalog, accept it, record payment", async ({ page }) => {
    await signIn(page, undefined, "/quotes")
    await page.getByRole("link", { name: "New quote" }).click()
    await page.getByRole("button", { name: "Alvarez Family" }).click()
    await expect(page.getByRole("heading", { level: 1, name: /Quote Q-1007/ })).toBeVisible()

    // tap items: qty 1 with an EMPTY price; tapping again adds +1
    await page.getByRole("button", { name: "Add Light Fixture Install" }).click()
    await expect(page.getByText("Added Light Fixture Install. Enter your price.")).toBeVisible()
    const priceFixture = page.getByLabel("Your price for Light Fixture Install")
    await expect(priceFixture).toHaveValue("")
    await expect(priceFixture).toHaveAttribute("placeholder", "last $85.00")
    await expect(priceFixture).toBeFocused()
    await page.getByRole("button", { name: "Add another Light Fixture Install" }).click()
    await expect(page.getByLabel("Quantity for Light Fixture Install")).toHaveValue("2")
    await priceFixture.fill("90")

    await page.getByRole("button", { name: "Electrical" }).click()
    await page.getByRole("button", { name: "Add Ceiling Fan Install" }).click()

    // unpriced line blocks accept (D6)
    await waitSaved(page)
    await page.getByRole("button", { name: "Accept and create job" }).click()
    await expect(page.getByText("Enter a price for 1 item first.")).toBeVisible()
    const pdfBlocked = await page.request.get(
      page.url().replace(/\/quotes\//, "/api/quotes/") + "/pdf"
    )
    expect(pdfBlocked.status()).toBe(409)

    await page.getByLabel("Your price for Ceiling Fan Install").fill("150.00")
    await page.getByRole("button", { name: "Custom line" }).click()
    await page.getByLabel("Line name").last().fill("Haul away old fan")
    await page.getByLabel("Your price for Haul away old fan").fill("25")
    await page.getByLabel("Job title").fill("Bedroom lights and fan")
    await page.getByLabel("Discount").fill("15")
    // 2 x 90 + 150 + 25 = 355, - 15 = 340, + 8% = 27.20 -> 367.20
    await expect(page.getByTestId("quote-total")).toHaveText("$367.20")
    await waitSaved(page)

    // reload: everything persisted
    await page.reload()
    await expect(page.getByTestId("quote-total")).toHaveText("$367.20")
    await expect(page.getByLabel("Line name")).toHaveCount(3)

    // the PDF renders
    const pdf = await page.request.get(page.url().replace(/\/quotes\//, "/api/quotes/") + "/pdf")
    expect(pdf.status()).toBe(200)
    expect(pdf.headers()["content-type"]).toBe("application/pdf")
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-")

    // Download PDF saves the file (D5)
    await page.getByRole("button", { name: "More quote actions" }).click()
    const [file] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: "Download PDF" }).click(),
    ])
    expect(file.suggestedFilename()).toBe("Q-1007.pdf")

    await page.getByRole("button", { name: "Mark as sent" }).click()
    await expect(page.getByText("Quote Q-1007 marked as sent")).toBeVisible()
    await page.getByRole("button", { name: "Accept and create job" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Accept and create job" }).click()
    await expect(page.getByText("Quote Q-1007 accepted, job added to pipeline")).toBeVisible()
    await expect(page.getByText("This quote was accepted, so it's locked.")).toBeVisible()

    // record payment: prefilled with the balance, as a Deposit (nothing paid yet)
    await page.getByRole("button", { name: "Record payment" }).click()
    const pay = page.getByRole("dialog", { name: "Record revenue" })
    await expect(pay.getByLabel("Amount")).toHaveValue("367.20")
    await expect(pay.getByRole("combobox", { name: "Category" })).toHaveText("Deposit")
    await pay.getByLabel("Amount").fill("100")
    await pay.getByRole("button", { name: "Record revenue" }).click()
    await expect(page.getByText("Payment recorded")).toBeVisible()

    // second payment defaults to Job Payment for the rest
    await page.getByRole("button", { name: "Record payment" }).click()
    const pay2 = page.getByRole("dialog", { name: "Record revenue" })
    await expect(pay2.getByLabel("Amount")).toHaveValue("267.20")
    await expect(pay2.getByRole("combobox", { name: "Category" })).toHaveText("Job Payment")
    await pay2.getByRole("button", { name: "Record revenue" }).click()
    await expect(page.getByText("Paid in full")).toBeVisible()

    // the job is in the customer's jobs
    await page.getByRole("link", { name: "Open job" }).click()
    await expect(page.locator("li[id^=job-]", { hasText: "Bedroom lights and fan" })).toContainText(
      "Scheduled"
    )

    // the list shows it paid
    await page.goto("/quotes")
    await expect(page.getByRole("row", { name: /Q-1007/ })).toContainText("Paid")
  })

  test("filter quotes by status and search", async ({ page }) => {
    await signIn(page, undefined, "/quotes")
    await expect(page.getByText("$841.80")).toBeVisible()
    await page.getByRole("button", { name: /Status:/ }).click()
    await page.getByRole("menuitem", { name: "Sent" }).click()
    await expect(page).toHaveURL(/status=SENT/)
    await expect(page.getByRole("row", { name: /Q-/ })).toHaveCount(1)
    await page.goto("/quotes")
    await page.getByPlaceholder("Search quotes").fill("oakwood")
    await expect(page.getByRole("row", { name: /Q-/ })).toHaveText([/Q-1002/])
  })
})

test("quote builder stacks Quick add above the sheet on a phone @mobile", async ({ page }) => {
  await signIn(page, undefined, "/quotes")
  await page
    .getByRole("link", { name: /Q-1006/ })
    .first()
    .click()
  const quick = await page.getByRole("heading", { name: "Quick add" }).boundingBox()
  const sheet = await page.getByRole("region", { name: "Quote sheet" }).boundingBox()
  expect(quick && sheet && quick.y < sheet.y).toBe(true)
  await expectNoHorizontalScroll(page)
})
