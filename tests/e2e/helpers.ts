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
