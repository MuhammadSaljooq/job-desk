import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import { zonedInstant } from "@/lib/dates"
import {
  dashboardJobs,
  ensureJobReminders,
  jobsView,
  moneyByMonth,
  openQuotes,
  pipelineView,
} from "@/features/dashboard/queries"
import { seedSampleRecords } from "@/features/settings/sample-data"
import { createBusiness, resetDb, signInAs } from "./helpers"

beforeEach(resetDb)
afterEach(() => signInAs(null))

const TODAY = "2026-09-29"

async function seeded() {
  const t = await createBusiness()
  await seedSampleRecords(db, {
    businessId: t.business.id,
    timezone: t.business.timezone,
    today: TODAY,
    team: { ownerId: t.owner.id, jordanId: t.jordan.id, alexId: t.alex.id },
  })
  return { ...t, now: zonedInstant(TODAY, "10:00", t.business.timezone) }
}

describe("dashboard jobs", () => {
  it("counts today's jobs, active work and the overdue job from the seed", async () => {
    const { business, now } = await seeded()
    const data = await dashboardJobs(business.id, business.timezone, now)
    const view = jobsView(data, { filter: "all", month: "2026-09" })
    expect(view).toMatchObject({ jobsToday: 2, active: 7, scheduled: 1, total: 10 })
    // nearest date first; the overdue turnover leads the strip
    expect(view.ongoing[0]).toMatchObject({
      title: "Unit 12 turnover repairs",
      overdue: true,
      chip: "2 days late",
    })
    expect(view.ongoing.map((j) => j.stage)).not.toContain("COMPLETED")
    expect(view.ongoing.at(-1)?.title).toBe("Kitchen lights")
    // calendar: only September's days, coloured by stage (overdue is blush)
    expect(view.events).toHaveLength(7)
    expect(view.events.find((e) => e.day === "2026-09-27")?.tone).toBe("blush")
    expect(view.byDay["2026-09-29"].map((j) => j.title).sort()).toEqual([
      "Bedroom TV mount",
      "Kitchen faucet and disposal",
    ])
  })

  it("filters rows 1 and 2 by Pending and In progress", async () => {
    const { business, now } = await seeded()
    const data = await dashboardJobs(business.id, business.timezone, now)
    const pending = jobsView(data, { filter: "pending", month: "2026-09" })
    expect(pending.ongoing.map((j) => j.stage).sort()).toEqual([
      "LEAD",
      "LEAD",
      "QUOTED",
      "QUOTED",
      "SCHEDULED",
    ])
    const inProgress = jobsView(data, { filter: "in_progress", month: "2026-09" })
    expect(inProgress.ongoing.map((j) => j.title)).toEqual([
      "Unit 12 turnover repairs",
      "Bedroom TV mount",
    ])
    expect(inProgress.events.map((e) => e.day).sort()).toEqual(["2026-09-27", "2026-09-29"])
    // the summary figures don't depend on the filter
    expect(inProgress.active).toBe(7)
  })

  it("groups every job into the five pipeline columns", async () => {
    const { business, now } = await seeded()
    const columns = pipelineView(await dashboardJobs(business.id, business.timezone, now))
    expect(columns.map((c) => [c.stage, c.count])).toEqual([
      ["LEAD", 2],
      ["QUOTED", 2],
      ["SCHEDULED", 1],
      ["IN_PROGRESS", 2],
      ["COMPLETED", 3],
    ])
  })

  it("never shows another business's jobs", async () => {
    const a = await seeded()
    const b = await createBusiness()
    const data = await dashboardJobs(b.business.id, b.business.timezone, a.now)
    expect(data.jobs).toHaveLength(0)
    expect(await openQuotes(b.business.id)).toEqual({ count: 0, value: 0 })
    expect((await moneyByMonth(b.business.id, "2026-09")).every((m) => !m.income)).toBe(true)
  })
})

describe("dashboard money", () => {
  it("open quotes are the sent ones waiting on a reply", async () => {
    const { business } = await seeded()
    expect(await openQuotes(business.id)).toEqual({ count: 1, value: 48060 })
  })

  it("sums money in and out per month for the last 6 months in SQL", async () => {
    const { business } = await seeded()
    expect(await moneyByMonth(business.id, "2026-09")).toEqual([
      { month: "2026-04", income: 0, expenses: 0 },
      { month: "2026-05", income: 76000, expenses: 26000 },
      { month: "2026-06", income: 230000, expenses: 30000 },
      { month: "2026-07", income: 115000, expenses: 29800 },
      { month: "2026-08", income: 162000, expenses: 22000 },
      { month: "2026-09", income: 93804, expenses: 65074 },
    ])
  })
})

describe("job reminders (D4)", () => {
  async function withTomorrowJob(stage: "SCHEDULED" | "COMPLETED" = "SCHEDULED") {
    const t = await seeded()
    const customer = await db.customer.findFirstOrThrow({ where: { businessId: t.business.id } })
    const job = await db.job.create({
      data: {
        businessId: t.business.id,
        customerId: customer.id,
        title: "Deck stain",
        stage,
        scheduledAt: zonedInstant("2026-09-30", "09:00", t.business.timezone),
      },
    })
    return { ...t, job, customer }
  }

  const reminders = (businessId: string) =>
    db.activity.findMany({ where: { businessId, type: "JOB_REMINDER" } })

  it("creates one unread reminder per job for tomorrow, even when loaded twice at once", async () => {
    const { business, now, job, customer } = await withTomorrowJob()
    await Promise.all([
      ensureJobReminders(business.id, business.timezone, now),
      ensureJobReminders(business.id, business.timezone, now),
    ])
    await ensureJobReminders(business.id, business.timezone, now)
    const rows = await reminders(business.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      entityId: job.id,
      message: "Job tomorrow",
      detail: `Deck stain for ${customer.name} at 9:00 am`,
      readAt: null,
    })
    // the seed's tomorrow jobs are a Lead and a Quoted one: no reminders for those
  })

  it("skips completed jobs and respects the setting", async () => {
    const done = await withTomorrowJob("COMPLETED")
    expect(await ensureJobReminders(done.business.id, done.business.timezone, done.now)).toBe(0)
    const off = await withTomorrowJob()
    await db.business.update({
      where: { id: off.business.id },
      data: { notifyJobReminders: false },
    })
    expect(await ensureJobReminders(off.business.id, off.business.timezone, off.now)).toBe(0)
    expect(await reminders(off.business.id)).toHaveLength(0)
  })
})
