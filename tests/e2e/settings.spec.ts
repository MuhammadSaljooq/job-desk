import { readFile } from "node:fs/promises"
import { expect, test } from "@playwright/test"
import { STAFF, expectNoHorizontalScroll, signIn } from "./helpers"

test.describe("settings", () => {
  test("the owner edits fields and saves them all at once", async ({ page }) => {
    await signIn(page, undefined, "/settings")
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible()
    const save = page.getByRole("button", { name: /Save settings|Saved/ })
    await expect(save).toBeDisabled()

    await page.getByLabel("Phone", { exact: true }).fill("(555) 444-3322")
    await page.getByLabel("Default tax %", { exact: true }).fill("8.25")
    await expect(save).toHaveText(/Save settings/)
    await save.click()
    await expect(page.getByText("Settings saved")).toBeVisible()

    await page.reload()
    await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("(555) 444-3322")
    await expect(page.getByLabel("Default tax %", { exact: true })).toHaveValue("8.25")

    // a quote number that's already used is refused before saving
    await page.getByLabel("Next quote number", { exact: true }).fill("1001")
    await page.getByRole("button", { name: "Save settings" }).click()
    await expect(page.getByText(/Must be above Q-\d+/)).toBeVisible()

    // put the tax back for the other specs
    await page.reload()
    await page.getByLabel("Default tax %", { exact: true }).fill("8")
    await page.getByRole("button", { name: "Save settings" }).click()
    await expect(page.getByText("Settings saved")).toBeVisible()
  })

  test("add a member who signs in with the temporary password", async ({ page, browser }) => {
    await signIn(page, undefined, "/settings")
    await page.getByRole("button", { name: "Add member" }).click()
    const dialog = page.getByRole("dialog", { name: "Add team member" })
    await dialog.getByLabel("Name").fill("Riley Park")
    await dialog.getByLabel("Email").fill("riley@jobdesk.test")
    await dialog.getByLabel("Title (optional)").fill("Apprentice")
    const password = await dialog.getByLabel("Temporary password").inputValue()
    expect(password.length).toBeGreaterThanOrEqual(8)
    await dialog.getByRole("button", { name: "Add member" }).click()
    await expect(page.getByText("Added Riley Park.", { exact: false })).toBeVisible()
    const team = page.getByRole("region", { name: "Team" })
    await expect(team).toContainText("Riley Park")
    await expect(team).toContainText("hasn't signed in yet")

    const other = await browser.newContext()
    const riley = await other.newPage()
    await riley.goto("/login")
    await riley.getByLabel("Email").fill("riley@jobdesk.test")
    await riley.getByLabel("Password").fill(password)
    await riley.getByRole("button", { name: "Sign in" }).click()
    await expect(riley).toHaveURL(/\/change-password/)
    await other.close()

    // remove them again (with confirmation)
    await team.getByRole("button", { name: "Manage Riley Park" }).click()
    await page.getByRole("menuitem", { name: "Remove" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click()
    await expect(page.getByText("Removed Riley Park")).toBeVisible()
    await expect(team).not.toContainText("Riley Park")
  })

  test("exports, dev storage, and the clear-all safety check", async ({ page }) => {
    await signIn(page, undefined, "/settings")
    await expect(page.getByRole("region", { name: "Photo storage" })).toContainText(
      "Using local dev storage"
    )
    await page.getByRole("button", { name: /Export/ }).click()
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: "Export customers" }).click(),
    ])
    expect(download.suggestedFilename()).toBe("jobdesk-customers.csv")
    const csv = await readFile((await download.path())!, "utf8")
    expect(csv).toContain("Name,Type,Status,Phone,Email,Address,Notes,Customer since")
    expect(csv).toContain("Oakwood Property Mgmt,Landlord")

    await page.getByRole("button", { name: /Clear all data/ }).click()
    const dialog = page.getByRole("dialog", { name: "Clear all data?" })
    const confirm = dialog.getByRole("button", { name: "Clear all data" })
    await expect(confirm).toBeDisabled()
    await dialog.getByRole("textbox").fill("wrong name")
    await expect(confirm).toBeDisabled()
    await dialog.getByRole("button", { name: "Cancel" }).click()
  })

  test("staff see settings read-only but can switch to dark mode", async ({ page }) => {
    await signIn(page, STAFF, "/settings")
    await expect(page.getByText("Only the owner can change settings.")).toBeVisible()
    await expect(page.getByRole("button", { name: /Save settings/ })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Add member" })).toHaveCount(0)
    await expect(page.getByRole("region", { name: "Data" })).toHaveCount(0)
    await expect(page.getByLabel("Phone", { exact: true })).toHaveAttribute("readonly", "")

    await page.getByRole("radio", { name: "Dark" }).click()
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
    await page.reload()
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
    await page.getByRole("radio", { name: "Match device" }).click()
    await expect(page.getByRole("radio", { name: "Match device" })).toHaveAttribute(
      "aria-checked",
      "true"
    )
  })
})

test("settings fit a phone @mobile", async ({ page }) => {
  await signIn(page, undefined, "/settings")
  await expect(page.getByRole("heading", { name: "Business profile" })).toBeVisible()
  await expectNoHorizontalScroll(page)
})
