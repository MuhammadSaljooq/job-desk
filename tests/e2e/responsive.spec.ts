import { expect, test } from "@playwright/test"
import { expectNoHorizontalScroll, signIn } from "./helpers"

// Every page at phone width: no sideways scrolling (catches the sr-only / grid regressions).
const PAGES = [
  "/",
  "/activity",
  "/customers",
  "/quotes",
  "/books",
  "/catalog",
  "/catalog?import=1",
  "/calendar",
  "/photos",
  "/settings",
]

test("every page fits a phone without sideways scrolling @mobile", async ({ page }) => {
  await signIn(page)
  for (const path of PAGES) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expectNoHorizontalScroll(page)
  }
  // a customer profile and its tabs
  await page.goto("/customers")
  await page.getByRole("link", { name: "Oakwood Property Mgmt", exact: true }).click()
  for (const tab of ["Job site photos", "Quotes", "Payments", "Jobs"]) {
    await page
      .getByRole("navigation", { name: "Customer sections" })
      .getByRole("link", { name: new RegExp(`^${tab}`) })
      .click()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expectNoHorizontalScroll(page)
  }
})
