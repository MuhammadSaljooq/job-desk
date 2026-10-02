// First run on a new production database (docs/DEPLOY.md, step 5):
//
//   pnpm setup:prod --business "Dylan's Home Services" --name "Dylan" --email dylan@example.com \
//     [--timezone America/New_York]
//
// Needs DATABASE_URL (or DATABASE_URL_UNPOOLED) for the production database, with migrations
// already applied (Vercel runs them on every deploy). Creates the business, the owner and the
// starter catalog, then prints the owner's one-time temporary password. Refuses if a business
// already exists.

import "dotenv/config"
import { parseArgs } from "node:util"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import { bootstrapProduction } from "../src/features/settings/bootstrap"

async function main() {
  const { values } = parseArgs({
    options: {
      business: { type: "string" },
      name: { type: "string" },
      email: { type: "string" },
      timezone: { type: "string" },
    },
  })
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  if (!url)
    throw new Error("Set DATABASE_URL (or DATABASE_URL_UNPOOLED) for the production database.")
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  try {
    const res = await bootstrapProduction(db, {
      businessName: values.business ?? "",
      ownerName: values.name ?? "",
      ownerEmail: values.email ?? "",
      timezone: values.timezone,
    })
    console.log(`
JobDesk is ready.
  Business created, with ${res.catalogItems} catalog items
  Owner:              ${res.ownerEmail}
  Temporary password: ${res.temporaryPassword}

Sign in with these; you'll be asked to choose your own password straight away.
This password is shown only once.
`)
  } finally {
    await db.$disconnect()
  }
}

main().catch((err) => {
  console.error(`\nsetup:prod failed: ${err instanceof Error ? err.message : err}\n`)
  process.exit(1)
})
