import "dotenv/config"

/** The integration database. Never the dev database: tests wipe it. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  (process.env.DATABASE_URL ?? "").replace(/\/jobdesk(\?|$)/, "/jobdesk_test$1")

if (!/_test(\?|$)/.test(TEST_DATABASE_URL)) {
  throw new Error(`Integration tests need a *_test database, got: ${TEST_DATABASE_URL}`)
}
