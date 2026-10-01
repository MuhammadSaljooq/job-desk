import path from "node:path"
import { expect, test } from "@playwright/test"
import { expectNoHorizontalScroll, signIn } from "./helpers"

const PHOTO = path.resolve("tests/fixtures/site-photo.jpg")

async function openPhotos(page: import("@playwright/test").Page, customer: string) {
  await signIn(page, undefined, "/customers")
  await page.getByRole("link", { name: customer, exact: true }).click()
  await page.getByRole("link", { name: /Job site photos/ }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: `${customer}: Job site photos` })
  ).toBeVisible()
}

test.describe("job site photos", () => {
  test("upload a photo, caption it, move it to After, delete it", async ({ page }) => {
    await openPhotos(page, "Priya Patel")
    await expect(page.getByText("No photos yet")).toBeVisible()

    // attach to the job, pick During, upload through the real browser pipeline
    await page.getByRole("radio", { name: "During" }).click()
    await page.locator("input[type=file]").setInputFiles(PHOTO)
    await expect(page.getByText("1 photo added to During")).toBeVisible({ timeout: 30_000 })

    const tile = page.getByRole("button", { name: /During photo/ })
    await expect(tile).toBeVisible()
    await expect(page.getByRole("heading", { name: /Home office assembly/ })).toBeVisible()
    // the thumbnail actually loads through /api/photos/{id}/file
    const img = tile.locator("img")
    await expect(img).toHaveJSProperty("complete", true)
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)

    // edit in the viewer: caption + stage (moves the file to the After folder)
    await tile.click()
    const viewer = page.getByRole("dialog")
    await viewer.getByLabel("Caption").fill("Desk assembled")
    await viewer.getByRole("radio", { name: "After" }).click()
    await viewer.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("Photo moved and saved")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("button", { name: "After photo: Desk assembled" })).toBeVisible()
    await expect(page.getByRole("tab", { name: /After 1/ })).toBeVisible()

    // the activity feed on the profile says so
    await page.getByRole("link", { name: /^Jobs/ }).click()
    await expect(page.getByText("1 During photo added to Home office assembly")).toBeVisible()

    // delete it
    await page.getByRole("link", { name: /Job site photos/ }).click()
    await page.getByRole("button", { name: "After photo: Desk assembled" }).click()
    await page.getByRole("button", { name: "Delete photo" }).click()
    await page
      .getByRole("dialog", { name: "Delete this photo?" })
      .getByRole("button", { name: "Delete photo" })
      .click()
    await expect(page.getByText("Photo deleted")).toBeVisible()
    await expect(page.getByText("No photos yet")).toBeVisible()
  })

  test("gallery groups by job, filters by stage and searches captions", async ({ page }) => {
    await openPhotos(page, "Oakwood Property Mgmt")
    await expect(page.getByRole("tab", { name: "All 7" })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Unit 12 turnover repairs/ })).toBeVisible()
    await page.getByRole("tab", { name: /Before 2/ }).click()
    await expect(page.getByRole("button", { name: /photo:/ })).toHaveCount(2)
    await page.getByRole("tab", { name: /All 7/ }).click()
    await page.getByPlaceholder("Search captions").fill("pendant")
    await expect(page.getByRole("button", { name: /photo:/ })).toHaveText([/Hallway pendant/])
    // viewer arrows
    await page.getByPlaceholder("Search captions").fill("")
    await page
      .getByRole("button", { name: /photo:/ })
      .first()
      .click()
    await expect(page.getByRole("dialog")).toContainText("1 of 7")
    await page.keyboard.press("ArrowRight")
    await expect(page.getByRole("dialog")).toContainText("2 of 7")
  })

  test("all-photos gallery filters by customer and stage", async ({ page }) => {
    await signIn(page, undefined, "/photos")
    await expect(page.getByText(/\d+ photos/)).toBeVisible()
    await page.getByRole("combobox", { name: "Customer" }).click()
    await page.getByRole("option", { name: "Sarah Mitchell" }).click()
    await expect(page).toHaveURL(/customer=/)
    await expect(page.getByText("2 photos")).toBeVisible()
    await page.getByRole("tab", { name: "After" }).click()
    await expect(page.getByText("1 photo", { exact: true })).toBeVisible()
  })
})

test("photo upload opens the camera on a phone @mobile", async ({ page }) => {
  await openPhotos(page, "David Chen")
  const input = page.locator("input[type=file]")
  await expect(input).toHaveAttribute("capture", "environment")
  await expect(input).toHaveAttribute("accept", "image/*")
  await expectNoHorizontalScroll(page)
})
