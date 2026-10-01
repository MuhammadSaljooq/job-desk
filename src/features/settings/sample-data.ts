// Demo data from docs/seed-data.md. Used by prisma/seed.ts and, in phase 10, by
// Settings > Data > "Reload sample data". Everything it creates (except the catalog and the
// team, which are real-looking setup data) is flagged isSample so it can be cleared safely.
//
// Dates are relative to "today" in the business timezone so the demo always looks current.

import type { PrismaClient } from "@/generated/prisma/client"
import { dayToDbDate, shiftDay, zonedInstant, type Day } from "@/lib/dates"
import { SAMPLE_CATALOG, catalogNameKey } from "@/features/catalog/sample-catalog"

type Db = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

export async function seedCatalog(db: Db, businessId: string) {
  const itemIds = new Map<string, string>()
  for (const [i, group] of SAMPLE_CATALOG.entries()) {
    const category = await db.catalogCategory.upsert({
      where: { businessId_name: { businessId, name: group.category } },
      update: {},
      create: { businessId, name: group.category, sortOrder: i },
    })
    for (const [name, unit] of group.items) {
      const item = await db.catalogItem.upsert({
        where: { categoryId_nameKey: { categoryId: category.id, nameKey: catalogNameKey(name) } },
        update: {},
        create: { businessId, categoryId: category.id, name, nameKey: catalogNameKey(name), unit },
      })
      itemIds.set(name, item.id)
    }
  }
  return itemIds
}

type Team = { ownerId: string; jordanId: string; alexId: string }

/** Customers, jobs, quotes, transactions and activity, all flagged isSample. */
export async function seedSampleRecords(
  db: Db,
  opts: { businessId: string; timezone: string; today: Day; team: Team }
) {
  const { businessId, timezone, today, team } = opts
  const itemIds = await seedCatalog(db, businessId)
  const at = (offset: number, time = "09:00") =>
    zonedInstant(shiftDay(today, offset), time, timezone)
  const day = (offset: number) => dayToDbDate(shiftDay(today, offset))

  // ---- customers
  const c = async (data: {
    name: string
    type: "HOMEOWNER" | "LANDLORD" | "BUSINESS"
    phone: string
    email: string
    address: string
    accessNotes?: string
    preferredContact?: string
    notes?: string
    since: number
  }) =>
    db.customer.create({
      data: {
        businessId,
        isSample: true,
        name: data.name,
        type: data.type,
        phone: data.phone,
        email: data.email,
        address: data.address,
        accessNotes: data.accessNotes,
        preferredContact: data.preferredContact,
        notes: data.notes,
        createdAt: at(-data.since, "10:00"),
      },
    })

  const sarah = await c({
    name: "Sarah Mitchell",
    type: "HOMEOWNER",
    phone: "(555) 214-8890",
    email: "sarah.mitchell@email.com",
    address: "142 Maple Ave",
    accessNotes: "Friendly dog on site, side gate",
    preferredContact: "Texts, after 5 pm",
    since: 62,
  })
  const david = await c({
    name: "David Chen",
    type: "HOMEOWNER",
    phone: "(555) 381-2207",
    email: "dchen@email.com",
    address: "88 Harbor View Dr, 4B",
    accessNotes: "Condo building. Book the service elevator a day ahead.",
    since: 40,
  })
  const oakwood = await c({
    name: "Oakwood Property Mgmt",
    type: "LANDLORD",
    phone: "(555) 600-4410",
    email: "maintenance@oakwoodpm.com",
    address: "2200 Oakwood Blvd",
    accessNotes: "Keys at the office.",
    notes: "Multi-unit landlord, 14 units. Send invoices to the office email.",
    since: 150,
  })
  const priya = await c({
    name: "Priya Patel",
    type: "HOMEOWNER",
    phone: "(555) 742-1934",
    email: "priya.p@email.com",
    address: "17 Birch Lane",
    since: 8,
  })
  const marcus = await c({
    name: "Marcus Johnson",
    type: "HOMEOWNER",
    phone: "(555) 918-3302",
    email: "mjohnson@email.com",
    address: "403 Cedar St",
    notes: "Referred by Sarah Mitchell.",
    since: 2,
  })
  const alvarez = await c({
    name: "Alvarez Family",
    type: "HOMEOWNER",
    phone: "(555) 455-0192",
    email: "alvarez.home@email.com",
    address: "9 Willow Ct",
    since: 90,
  })

  // ---- jobs
  const j = async (data: {
    customerId: string
    title: string
    category: string
    stage: "LEAD" | "QUOTED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED"
    on: number | null
    time?: string
    assignees: string[]
    notes?: string
  }) =>
    db.job.create({
      data: {
        businessId,
        isSample: true,
        customerId: data.customerId,
        title: data.title,
        category: data.category,
        stage: data.stage,
        scheduledAt: data.on === null ? null : at(data.on, data.time ?? "09:00"),
        completedAt: data.stage === "COMPLETED" && data.on !== null ? at(data.on, "16:00") : null,
        notes: data.notes,
        assignees: { connect: data.assignees.map((id) => ({ id })) },
      },
    })

  const jLivingRoom = await j({
    customerId: sarah.id,
    title: "Living room TV mount",
    category: "TV & Mounting",
    stage: "COMPLETED",
    on: -24,
    assignees: [team.jordanId],
    notes: '65" TV, stud mounted. Customer supplied TV.',
  })
  await j({
    customerId: sarah.id,
    title: "Hallway drywall and paint",
    category: "Drywall & Paint",
    stage: "SCHEDULED",
    on: 3,
    assignees: [team.jordanId, team.alexId],
    notes: "Bring 2 sheets of drywall and primer",
  })
  const jBedroom = await j({
    customerId: david.id,
    title: "Bedroom TV mount",
    category: "TV & Mounting",
    stage: "IN_PROGRESS",
    on: 0,
    time: "10:30",
    assignees: [team.jordanId],
    notes: "Concrete wall, bring masonry anchors.",
  })
  const jUnit12 = await j({
    customerId: oakwood.id,
    title: "Unit 12 turnover repairs",
    category: "Repairs",
    stage: "IN_PROGRESS",
    on: -2,
    assignees: [team.ownerId, team.jordanId, team.alexId],
    notes: "Tenant moved out. Keys at the office.",
  })
  await j({
    customerId: oakwood.id,
    title: "Unit 7 light fixtures",
    category: "Electrical",
    stage: "COMPLETED",
    on: -40,
    assignees: [team.alexId],
  })
  const jOffice = await j({
    customerId: priya.id,
    title: "Home office assembly",
    category: "Assembly",
    stage: "QUOTED",
    on: 1,
    time: "13:00",
    assignees: [],
  })
  const jFaucet = await j({
    customerId: marcus.id,
    title: "Kitchen faucet and disposal",
    category: "Plumbing",
    stage: "LEAD",
    on: 0,
    time: "15:00",
    assignees: [],
    notes: "Called in, wants a quote this week.",
  })
  await j({
    customerId: david.id,
    title: "Floating shelves in living room",
    category: "TV & Mounting",
    stage: "LEAD",
    on: 1,
    time: "11:00",
    assignees: [],
  })
  const jKitchenLights = await j({
    customerId: sarah.id,
    title: "Kitchen lights",
    category: "Electrical",
    stage: "QUOTED",
    on: 15,
    assignees: [team.alexId],
    notes: "Awaiting reply on Q-1006",
  })
  await j({
    customerId: alvarez.id,
    title: "Ceiling fan install",
    category: "Electrical",
    stage: "COMPLETED",
    on: -20,
    assignees: [team.jordanId],
  })

  // ---- quotes (numbers 1001-1006; business.nextQuoteNumber is set to 1007 by the caller)
  const line = (name: string, qty: number, price: number | null, sortOrder: number) => {
    const group = SAMPLE_CATALOG.find((g) => g.items.some(([n]) => n === name))
    const unit = group?.items.find(([n]) => n === name)?.[1]
    return {
      businessId,
      catalogItemId: itemIds.get(name) ?? null,
      name,
      category: group?.category ?? null,
      unit: unit ?? null,
      qty,
      unitPriceCents: price === null ? null : Math.round(price * 100),
      sortOrder,
    }
  }
  const q = async (data: {
    number: number
    customerId: string
    jobId: string
    title: string
    on: number
    status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED"
    notes?: string
    lines: [string, number, number | null][]
  }) =>
    db.quote.create({
      data: {
        businessId,
        isSample: true,
        number: data.number,
        customerId: data.customerId,
        jobId: data.jobId,
        title: data.title,
        date: day(data.on),
        status: data.status,
        taxRateBps: 800,
        notes: data.notes,
        footer: "Thank you for the opportunity",
        sentAt: data.status !== "DRAFT" ? at(data.on, "17:00") : null,
        acceptedAt: data.status === "ACCEPTED" ? at(data.on + 1, "09:40") : null,
        lines: { create: data.lines.map(([n, qty, p], i) => line(n, qty, p, i)) },
      },
    })

  const q1001 = await q({
    number: 1001,
    customerId: sarah.id,
    jobId: jLivingRoom.id,
    title: "Living room TV mount",
    on: -30,
    status: "ACCEPTED",
    notes:
      "Full motion bracket mounted into studs, with in-wall power and cable kit. Customer supplies the TV.",
    lines: [
      ["TV Wall Mount (Full Motion)", 1, 149],
      ["In-Wall Cable Concealment", 1, 129],
      ["Mounting Hardware Kit", 1, 35],
    ],
  })
  const q1002 = await q({
    number: 1002,
    customerId: oakwood.id,
    jobId: jUnit12.id,
    title: "Unit 12 turnover repairs",
    on: -6,
    status: "ACCEPTED",
    notes: "Patch and paint living room, replace four damaged outlets and switches.",
    lines: [
      ["Drywall Patch (Large)", 2, 145],
      ["Interior Wall Painting", 1, 320],
      ["Outlet / Switch Replacement", 4, 45],
      ["Joint Compound", 1, 18],
      ["Paint & Primer", 2, 42],
      ["Hourly Labor", 3, 75],
    ],
  })
  const q1003 = await q({
    number: 1003,
    customerId: priya.id,
    jobId: jOffice.id,
    title: "Home office furniture assembly",
    on: -2,
    status: "SENT",
    notes: "Two desks and three bookshelves. Boxes and packaging hauled away.",
    lines: [
      ["Desk / Office Assembly", 2, 95],
      ["Furniture Assembly", 3, 65],
      ["Haul-Away / Disposal", 1, 60],
    ],
  })
  const q1004 = await q({
    number: 1004,
    customerId: david.id,
    jobId: jBedroom.id,
    title: "Bedroom TV mount and soundbar",
    on: -5,
    status: "ACCEPTED",
    lines: [
      ["TV Wall Mount (Full Motion)", 1, 149],
      ["Soundbar Mount", 1, 69],
    ],
  })
  await q({
    number: 1005,
    customerId: marcus.id,
    jobId: jFaucet.id,
    title: "Kitchen faucet and disposal",
    on: 0,
    status: "DRAFT",
    lines: [
      ["Faucet Replacement", 1, null],
      ["Garbage Disposal Install", 1, null],
    ],
  })
  await q({
    number: 1006,
    customerId: sarah.id,
    jobId: jKitchenLights.id,
    title: "Kitchen light fixtures",
    on: 0,
    status: "DRAFT",
    notes:
      "Replace three kitchen ceiling lights and install the new ceiling fan. Customer supplies fixtures and fan.",
    lines: [
      ["Light Fixture Install", 3, 85],
      ["Ceiling Fan Install", 1, null],
      ["Mounting Hardware Kit", 1, 35],
      ["Service Call / Trip Fee", 1, 40],
    ],
  })

  // ---- transactions
  type Cat =
    | "JOB_PAYMENT"
    | "DEPOSIT"
    | "OTHER_INCOME"
    | "MATERIALS"
    | "TOOLS_EQUIPMENT"
    | "FUEL_VEHICLE"
    | "SUBCONTRACTOR"
    | "INSURANCE"
    | "MARKETING"
    | "SOFTWARE"
    | "OTHER_EXPENSE"
  const t = (
    type: "INCOME" | "EXPENSE",
    amount: number,
    on: number,
    category: Cat,
    description: string,
    customerId?: string,
    quoteId?: string
  ) => ({
    businessId,
    isSample: true,
    type,
    amountCents: Math.round(amount * 100),
    date: day(-on),
    category,
    description,
    customerId: customerId ?? null,
    quoteId: quoteId ?? null,
    createdById: team.ownerId,
  })
  await db.transaction.createMany({
    data: [
      t("INCOME", 338.04, 22, "JOB_PAYMENT", "Payment for Q-1001", sarah.id, q1001.id),
      t("INCOME", 640, 38, "JOB_PAYMENT", "Unit 7 light fixtures", oakwood.id),
      t("INCOME", 500, 3, "DEPOSIT", "Deposit for Q-1002", oakwood.id, q1002.id),
      t("INCOME", 100, 1, "DEPOSIT", "Deposit for Q-1004", david.id, q1004.id),
      t("INCOME", 980, 55, "JOB_PAYMENT", "Unit 3 repairs", oakwood.id),
      t("INCOME", 1150, 70, "JOB_PAYMENT", "Kitchen backsplash repair"),
      t("INCOME", 880, 95, "JOB_PAYMENT", "Deck board replacement"),
      t("INCOME", 1420, 120, "JOB_PAYMENT", "Basement drywall finishing"),
      t("INCOME", 760, 150, "JOB_PAYMENT", "Bathroom fixtures refresh"),
      t("EXPENSE", 186.4, 3, "MATERIALS", "Drywall, compound and screws", oakwood.id),
      t("EXPENSE", 62.1, 6, "FUEL_VEHICLE", "Fuel"),
      t("EXPENSE", 29, 10, "SOFTWARE", "Scheduling app subscription"),
      t("EXPENSE", 139.99, 15, "TOOLS_EQUIPMENT", "Stud finder and laser level"),
      t("EXPENSE", 88.25, 25, "MATERIALS", "Mount hardware and cable kit", sarah.id),
      t("EXPENSE", 145, 28, "INSURANCE", "General liability, monthly"),
      t("EXPENSE", 75, 45, "MARKETING", "Door hanger flyers"),
      t("EXPENSE", 145, 58, "INSURANCE", "General liability, monthly"),
      t("EXPENSE", 58, 60, "FUEL_VEHICLE", "Fuel"),
      t("EXPENSE", 240, 72, "MATERIALS", "Tile and grout"),
      t("EXPENSE", 300, 100, "SUBCONTRACTOR", "Licensed electrician, panel work"),
      t("EXPENSE", 190, 125, "MATERIALS", "Drywall sheets"),
      t("EXPENSE", 70, 140, "FUEL_VEHICLE", "Fuel"),
    ],
  })

  // ---- activity (newest first in the UI)
  const a = (
    type:
      "NOTE" | "QUOTE_ACCEPTED" | "PHOTO_UPLOADED" | "PAYMENT_RECORDED" | "NEW_LEAD" | "QUOTE_SENT",
    message: string,
    detail: string,
    customerId: string,
    entity: string,
    entityId: string,
    when: Date,
    read: boolean,
    actorId: string | null = team.ownerId
  ) => ({
    businessId,
    isSample: true,
    type,
    message,
    detail,
    customerId,
    entity,
    entityId,
    actorId,
    createdAt: when,
    readAt: read ? when : null,
  })
  await db.activity.createMany({
    data: [
      a(
        "QUOTE_ACCEPTED",
        "Quote Q-1004 accepted",
        "David Chen accepted the bedroom TV mount quote",
        david.id,
        "quote",
        q1004.id,
        at(0, "09:40"),
        false
      ),
      a(
        "PHOTO_UPLOADED",
        "Photo uploaded",
        "2 During photos added to Unit 12 turnover",
        oakwood.id,
        "job",
        jUnit12.id,
        at(0, "09:12"),
        false,
        team.jordanId
      ),
      a(
        "PAYMENT_RECORDED",
        "Payment recorded",
        "$338.04 for Q-1001, paid in full",
        sarah.id,
        "quote",
        q1001.id,
        at(-22, "16:20"),
        true
      ),
      a(
        "NEW_LEAD",
        "New lead",
        "Marcus Johnson wants a faucet and disposal quote",
        marcus.id,
        "job",
        jFaucet.id,
        at(-2, "11:05"),
        true,
        null
      ),
      a(
        "QUOTE_SENT",
        "Quote sent",
        "Q-1003 office furniture assembly, $480.60",
        priya.id,
        "quote",
        q1003.id,
        at(-2, "17:00"),
        true
      ),
      a(
        "NOTE",
        "Sarah Mitchell",
        "Can you also look at the kitchen lights while you're here?",
        sarah.id,
        "customer",
        sarah.id,
        at(-3, "18:30"),
        true,
        null
      ),
      a(
        "NOTE",
        "Job note",
        "Bring 2 sheets of drywall and primer on Friday",
        sarah.id,
        "customer",
        sarah.id,
        at(-4, "08:15"),
        true,
        team.jordanId
      ),
    ],
  })
}

/** Remove everything flagged isSample (Settings > Data > Clear sample data). */
export async function clearSampleRecords(db: Db, businessId: string) {
  // Children first; quote lines and job/photo links cascade from their parents.
  await db.activity.deleteMany({ where: { businessId, isSample: true } })
  await db.transaction.deleteMany({ where: { businessId, isSample: true } })
  await db.quote.deleteMany({ where: { businessId, isSample: true } })
  await db.job.deleteMany({ where: { businessId, isSample: true } })
  await db.customer.deleteMany({ where: { businessId, isSample: true } })
}
