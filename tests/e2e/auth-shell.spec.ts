import { expect, test } from "@playwright/test"
import { OWNER, signIn } from "./helpers"

test.describe("sign in and the app shell", () => {
  test("protected pages send you to sign in, then back", async ({ page }) => {
    await page.goto("/customers")
    await expect(page).toHaveURL(/\/login\?next=%2Fcustomers$/)
    await page.getByLabel("Email").fill(OWNER.email)
    await page.getByLabel("Password").fill("wrong-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page.getByTestId("form-error")).toContainText("don't match")
    await expect(page.getByLabel("Email")).toHaveValue(OWNER.email)
    await page.getByLabel("Password").fill(OWNER.password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL(/\/customers$/)
    await expect(page.getByRole("heading", { level: 1, name: "Customers" })).toBeVisible()
  })

  test("pill nav and rail reach every section", async ({ page }) => {
    await signIn(page)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your Company")
    const main = page.getByRole("navigation", { name: "Main" }).first()
    for (const [label, heading] of [
      ["Customers", "Customers"],
      ["Quotes", "Fast quotes"],
      ["Books", "Bookkeeping"],
      ["Home", "Your Company"],
    ] as const) {
      await main.getByRole("link", { name: label }).click()
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading)
      await expect(main.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page")
    }
    const rail = page.getByRole("navigation", { name: "Tools" })
    for (const [label, heading] of [
      ["Activity", "Activity"],
      ["Item catalog", "Item catalog"],
      ["Calendar", "Calendar"],
      ["Photos", "Photos"],
      ["Settings", "Settings"],
    ] as const) {
      await rail.getByRole("link", { name: label }).click()
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading)
    }
  })

  test("⌘K search jumps to a quote", async ({ page }) => {
    await signIn(page)
    await page.keyboard.press("ControlOrMeta+k")
    await page.getByPlaceholder("Search customers, jobs and quotes").fill("1004")
    await page.getByRole("option", { name: /Q-1004/ }).click()
    await expect(page).toHaveURL(/\/quotes\/[a-z0-9]+$/)
  })

  test("notifications show unread activity and can be cleared", async ({ page }) => {
    await signIn(page)
    await page.getByRole("button", { name: /Notifications, 2 unread/ }).click()
    await expect(page.getByText("Quote Q-1004 accepted").first()).toBeVisible()
    await page.getByRole("button", { name: "Mark all read" }).click()
    await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible()
  })

  test("sign out", async ({ page }) => {
    await signIn(page)
    await page.getByRole("button", { name: "Account menu" }).click()
    await page.getByRole("menuitem", { name: "Sign out" }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto("/quotes")
    await expect(page).toHaveURL(/\/login/)
  })
})

test("phone layout uses the bottom tab bar and More sheet @mobile", async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole("navigation", { name: "Tools" })).toBeHidden()
  const tabs = page.getByRole("navigation", { name: "Main" })
  await tabs.getByRole("link", { name: "Quotes" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fast quotes")
  await tabs.getByRole("button", { name: "More" }).click()
  await page.getByRole("dialog").getByRole("link", { name: "Item catalog" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Item catalog")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
