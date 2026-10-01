import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import {
  addNoteAction,
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/features/customers/actions"
import {
  changeJobStageAction,
  createJobAction,
  deleteJobAction,
  updateJobAction,
} from "@/features/jobs/actions"
import { getCustomerProfile, listCustomers } from "@/features/customers/queries"
import { seedSampleRecords } from "@/features/settings/sample-data"
import { createBusiness, resetDb, signInAs } from "./helpers"

beforeEach(resetDb)
afterEach(() => signInAs(null))

describe("customer actions", () => {
  it("creates, edits and validates customers", async () => {
    const { business, jordan } = await createBusiness()
    signInAs(jordan)
    const bad = await createCustomerAction({ name: "  ", email: "nope" })
    expect(bad.ok).toBe(false)
    if (!bad.ok)
      expect(bad.fieldErrors).toMatchObject({ name: expect.any(String), email: expect.any(String) })

    const res = await createCustomerAction({
      name: " Priya Patel ",
      phone: "(555) 742-1934",
      email: "PRIYA@Email.com",
      address: "17 Birch Lane",
      accessNotes: "",
    })
    expect(res.ok).toBe(true)
    const id = res.ok ? res.data.id : ""
    const c = await db.customer.findUniqueOrThrow({ where: { id } })
    expect(c).toMatchObject({
      businessId: business.id,
      name: "Priya Patel",
      email: "priya@email.com",
      accessNotes: null,
      type: "HOMEOWNER",
      status: "ACTIVE",
    })
    expect(await db.activity.count({ where: { customerId: id, type: "CUSTOMER_CREATED" } })).toBe(1)

    const upd = await updateCustomerAction(id, {
      name: "Priya Patel",
      type: "LANDLORD",
      status: "PAST",
    })
    expect(upd.ok).toBe(true)
    // omitted fields are left alone; an empty string (what the dialog sends) clears them
    expect(await db.customer.findUniqueOrThrow({ where: { id } })).toMatchObject({
      type: "LANDLORD",
      status: "PAST",
      phone: "(555) 742-1934",
    })
    await updateCustomerAction(id, { name: "Priya Patel", phone: "" })
    expect((await db.customer.findUniqueOrThrow({ where: { id } })).phone).toBeNull()
  })

  it("only the owner can delete a customer", async () => {
    const { business, owner, jordan } = await createBusiness()
    const c = await db.customer.create({ data: { businessId: business.id, name: "Del Me" } })
    signInAs(jordan)
    expect(await deleteCustomerAction(c.id)).toEqual({
      ok: false,
      error: "Only the owner can do that.",
    })
    signInAs(owner)
    expect(await deleteCustomerAction(c.id)).toEqual({ ok: true, data: { name: "Del Me" } })
    expect(await db.customer.count({ where: { id: c.id } })).toBe(0)
  })

  it("can't touch another business's customers", async () => {
    const a = await createBusiness()
    const b = await createBusiness()
    const theirs = await db.customer.create({ data: { businessId: b.business.id, name: "Theirs" } })
    signInAs(a.owner)
    expect((await updateCustomerAction(theirs.id, { name: "Hacked" })).ok).toBe(false)
    expect((await deleteCustomerAction(theirs.id)).ok).toBe(false)
    expect((await addNoteAction(theirs.id, "hi")).ok).toBe(false)
    expect((await createJobAction({ customerId: theirs.id, title: "x" })).ok).toBe(false)
    expect((await db.customer.findUniqueOrThrow({ where: { id: theirs.id } })).name).toBe("Theirs")
  })

  it("adds notes as read activity for the customer", async () => {
    const { business, jordan } = await createBusiness()
    const c = await db.customer.create({ data: { businessId: business.id, name: "Sarah" } })
    signInAs(jordan)
    expect((await addNoteAction(c.id, "  ")).ok).toBe(false)
    expect((await addNoteAction(c.id, "Gate code 1234")).ok).toBe(true)
    const note = await db.activity.findFirstOrThrow({ where: { customerId: c.id, type: "NOTE" } })
    expect(note).toMatchObject({ detail: "Gate code 1234", actorId: jordan.id })
    expect(note.readAt).not.toBeNull()
  })
})

describe("job actions", () => {
  it("creates a scheduled job at local time with assignees", async () => {
    const { business, owner, jordan, alex } = await createBusiness()
    const c = await db.customer.create({ data: { businessId: business.id, name: "Sarah" } })
    signInAs(owner)
    const missingDate = await createJobAction({
      customerId: c.id,
      title: "Drywall",
      stage: "SCHEDULED",
    })
    expect(missingDate.ok).toBe(false)
    const res = await createJobAction({
      customerId: c.id,
      title: "Hallway drywall",
      category: "Drywall & Paint",
      stage: "SCHEDULED",
      date: "2026-10-02",
      time: "",
      assigneeIds: [jordan.id, alex.id, jordan.id],
    })
    expect(res.ok).toBe(true)
    const job = await db.job.findUniqueOrThrow({
      where: { id: res.ok ? res.data.id : "" },
      include: { assignees: true },
    })
    expect(job.scheduledAt?.toISOString()).toBe("2026-10-02T13:00:00.000Z") // 09:00 New York
    expect(job.assignees.map((a) => a.id).sort()).toEqual([jordan.id, alex.id].sort())
  })

  it("rejects assignees from another business", async () => {
    const a = await createBusiness()
    const b = await createBusiness()
    const c = await db.customer.create({ data: { businessId: a.business.id, name: "Sarah" } })
    signInAs(a.owner)
    const res = await createJobAction({ customerId: c.id, title: "x", assigneeIds: [b.jordan.id] })
    expect(res).toEqual({ ok: false, error: "Pick team members from your business." })
  })

  it("changing the stage writes activity and sets completedAt", async () => {
    const { business, jordan } = await createBusiness()
    const c = await db.customer.create({ data: { businessId: business.id, name: "Sarah" } })
    const j = await db.job.create({
      data: { businessId: business.id, customerId: c.id, title: "TV mount" },
    })
    signInAs(jordan)
    expect(await changeJobStageAction(j.id, "COMPLETED")).toEqual({
      ok: true,
      data: { stage: "COMPLETED" },
    })
    const after = await db.job.findUniqueOrThrow({ where: { id: j.id } })
    expect(after.completedAt).not.toBeNull()
    const act = await db.activity.findFirstOrThrow({
      where: { entityId: j.id, type: "JOB_STAGE_CHANGED" },
    })
    expect(act.detail).toBe("TV mount: Lead → Completed")
    // no-op change writes nothing
    await changeJobStageAction(j.id, "COMPLETED")
    expect(await db.activity.count({ where: { entityId: j.id } })).toBe(1)
    // back to in progress clears completedAt
    await changeJobStageAction(j.id, "QUOTED")
    expect((await db.job.findUniqueOrThrow({ where: { id: j.id } })).completedAt).toBeNull()
    // invalid stage
    expect((await changeJobStageAction(j.id, "DONE" as never)).ok).toBe(false)
  })

  it("edits and deletes jobs; can't move a job to another customer", async () => {
    const { business, owner } = await createBusiness()
    const c1 = await db.customer.create({ data: { businessId: business.id, name: "A" } })
    const c2 = await db.customer.create({ data: { businessId: business.id, name: "B" } })
    const j = await db.job.create({
      data: { businessId: business.id, customerId: c1.id, title: "Job" },
    })
    signInAs(owner)
    expect((await updateJobAction(j.id, { customerId: c2.id, title: "Job" })).ok).toBe(false)
    const upd = await updateJobAction(j.id, {
      customerId: c1.id,
      title: "Renamed",
      stage: "QUOTED",
    })
    expect(upd.ok).toBe(true)
    expect(await db.activity.count({ where: { entityId: j.id, type: "JOB_STAGE_CHANGED" } })).toBe(
      1
    )
    expect(await deleteJobAction(j.id)).toEqual({ ok: true, data: { title: "Renamed" } })
    expect(await db.job.count({ where: { id: j.id } })).toBe(0)
  })
})

describe("customer queries", () => {
  async function seeded() {
    const { business, owner, jordan, alex } = await createBusiness()
    await seedSampleRecords(db, {
      businessId: business.id,
      timezone: business.timezone,
      today: "2026-09-29",
      team: { ownerId: owner.id, jordanId: jordan.id, alexId: alex.id },
    })
    return business
  }
  const now = new Date("2026-09-29T16:00:00Z")

  it("lists cards with counts, latest job and filters", async () => {
    const business = await seeded()
    const all = await listCustomers(business.id, { timezone: business.timezone, now })
    expect(all.map((c) => c.name)).toEqual([
      "Alvarez Family",
      "David Chen",
      "Marcus Johnson",
      "Oakwood Property Mgmt",
      "Priya Patel",
      "Sarah Mitchell",
    ])
    const sarah = all.find((c) => c.name === "Sarah Mitchell")!
    expect(sarah).toMatchObject({ jobCount: 3, activeJobCount: 2, balance: 0 })
    expect(sarah.latestJob?.title).toBe("Hallway drywall and paint")
    const oakwood = all.find((c) => c.name === "Oakwood Property Mgmt")!
    expect(oakwood.latestJob).toMatchObject({ title: "Unit 12 turnover repairs", overdue: true })

    const owes = await listCustomers(business.id, {
      timezone: business.timezone,
      filter: "owes",
      now,
    })
    expect(owes.map((c) => c.name).sort()).toEqual(["David Chen", "Oakwood Property Mgmt"])
    const active = await listCustomers(business.id, {
      timezone: business.timezone,
      filter: "active",
      now,
    })
    expect(active.map((c) => c.name)).not.toContain("Alvarez Family")
    const none = await listCustomers(business.id, {
      timezone: business.timezone,
      filter: "none",
      now,
    })
    expect(none).toEqual([])
  })

  it("searches by name, phone digits and address", async () => {
    const business = await seeded()
    const s = (q: string) =>
      listCustomers(business.id, { timezone: business.timezone, q, now }).then((r) =>
        r.map((c) => c.name)
      )
    expect(await s("mitch")).toEqual(["Sarah Mitchell"])
    expect(await s("214-8890")).toEqual(["Sarah Mitchell"])
    expect(await s("5552148890")).toEqual(["Sarah Mitchell"])
    expect(await s("willow")).toEqual(["Alvarez Family"])
    expect(await s("zzz")).toEqual([])
  })

  it("builds the profile summary (Sarah: accepted = paid, balance 0)", async () => {
    const business = await seeded()
    const sarah = await db.customer.findFirstOrThrow({
      where: { businessId: business.id, name: "Sarah Mitchell" },
    })
    const p = await getCustomerProfile(business.id, sarah.id)
    expect(p?.summary).toMatchObject({
      jobs: 3,
      quotes: 2,
      accepted: 33804,
      paid: 33804,
      balance: 0,
      payments: 1,
    })
    const other = await createBusiness()
    expect(await getCustomerProfile(other.business.id, sarah.id)).toBeNull()
  })
})
