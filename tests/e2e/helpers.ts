import { expect, type Page } from "@playwright/test"

export const OWNER = { email: "owner@jobdesk.test", password: "jobdesk123" }
export const STAFF = { email: "jordan@jobdesk.test", password: "jobdesk123" }

export async function signIn(page: Page, who = OWNER, next = "/") {
  await page.goto(next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`)
  await page.getByLabel("Email").fill(who.email)
  await page.getByLabel("Password").fill(who.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[?]/g, "\\?")}$`))
}

/**
 * No sideways scrolling. On mobile emulation Chrome widens the layout viewport to fit
 * oversized content (innerWidth grows), so compare against the real viewport width.
 */
export async function expectNoHorizontalScroll(page: Page) {
  const r = await page.evaluate(() => ({
    layout: window.innerWidth,
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  const width = page.viewportSize()?.width ?? r.viewport
  expect(r.layout, "layout viewport wider than the screen").toBeLessThanOrEqual(width)
  expect(r.scroll, "page scrolls sideways").toBeLessThanOrEqual(width)
}
