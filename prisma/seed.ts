// Development seed (docs/seed-data.md). Wipes the database, then creates one business,
// the owner + 2 staff, the 44-item catalog and the sample customers, jobs, quotes,
// transactions and activity. Run with `pnpm db:seed` (or `pnpm db:reset`).
//
// Sign in afterwards with any of these (password "jobdesk123"):
//   owner@jobdesk.test (Owner), jordan@jobdesk.test, alex@jobdesk.test (Staff)

import "dotenv/config"
import bcrypt from "bcryptjs"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import { dayInZone } from "../src/lib/dates"
import { seedSampleRecords } from "../src/features/settings/sample-data"

const DEMO_PASSWORD = "jobdesk123"
const TIMEZONE = "America/New_York"

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the demo seed in production.")
  }
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })

  try {
    // Wipe everything (dev only). Business cascades to every business-owned table.
    await db.verificationToken.deleteMany()
    await db.business.deleteMany()

    const business = await db.business.create({
      data: {
        name: "Your Company",
        tagline: "Handyman and home repair",
        phone: "(555) 100-2000",
        email: "hello@yourcompany.com",
        currency: "USD",
        timezone: TIMEZONE,
        taxRateBps: 800,
        nextQuoteNumber: 1007,
        quoteFooter: "Thank you for the opportunity",
        notifyJobReminders: true,
        notifyPayments: false,
      },
    })

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
    const user = (
      name: string,
      email: string,
      role: "OWNER" | "STAFF",
      color: string,
      title?: string
    ) =>
      db.user.create({
        data: {
          businessId: business.id,
          name,
          email,
          role,
          avatarColor: color,
          title,
          passwordHash,
        },
      })
    const owner = await user("Owner account", "owner@jobdesk.test", "OWNER", "#2D3436")
    const jordan = await user(
      "Jordan Reyes",
      "jordan@jobdesk.test",
      "STAFF",
      "#D09A36",
      "Technician"
    )
    const alex = await user("Alex Lin", "alex@jobdesk.test", "STAFF", "#3F8F93", "Technician")

    await seedSampleRecords(db, {
      businessId: business.id,
      timezone: TIMEZONE,
      today: dayInZone(new Date(), TIMEZONE),
      team: { ownerId: owner.id, jordanId: jordan.id, alexId: alex.id },
    })

    const counts = {
      users: await db.user.count(),
      categories: await db.catalogCategory.count(),
      items: await db.catalogItem.count(),
      customers: await db.customer.count(),
      jobs: await db.job.count(),
      quotes: await db.quote.count(),
      quoteLines: await db.quoteLine.count(),
      transactions: await db.transaction.count(),
      activities: await db.activity.count(),
    }
    console.log("Seeded:", counts)
    console.log(`Sign in: owner@jobdesk.test / ${DEMO_PASSWORD}`)
  } finally {
    await db.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
