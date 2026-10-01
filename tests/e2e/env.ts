import "dotenv/config"

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  (process.env.DATABASE_URL ?? "").replace(/\/jobdesk(\?|$)/, "/jobdesk_e2e$1")

if (!/_e2e(\?|$)/.test(E2E_DATABASE_URL)) {
  throw new Error(`E2E tests need a *_e2e database, got: ${E2E_DATABASE_URL}`)
}
