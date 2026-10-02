import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { setStorageOverride, type ProviderKind } from "@/lib/storage"
import { FakeStorage } from "@/lib/storage/fake"
import { verifyCredentials } from "@/features/auth/credentials"
import { createTransactionAction } from "@/features/books/actions"
import { listTeam } from "@/features/customers/queries"
import { updateJobAction } from "@/features/jobs/actions"
import {
  addMemberAction,
  clearAllDataAction,
  copyPhotosBatchAction,
  reloadSampleDataAction,
  removeMemberAction,
  resetMemberPasswordAction,
  saveLogoAction,
  saveSettingsAction,
  setThemeAction,
  updateMemberAction,
} from "@/features/settings/actions"
import { seedSampleRecords } from "@/features/settings/sample-data"
import { parseLogoThumb } from "@/features/settings/service"
import { getSettingsView } from "@/features/settings/queries"
import { createBusiness, resetDb, signInAs } from "./helpers"

beforeEach(resetDb)
afterEach(() => {
  signInAs(null)
  setStorageOverride(null)
})

const settings = (over: Record<string, unknown> = {}) => ({
  name: "Dylan Home Services",
  tagline: "TV mounting and repairs",
  phone: "(555) 100-2000",
  email: "Hello@Dylan.example",
  address: "12 Main St",
  timezone: "America/Chicago",
  currency: "CAD",
  taxRateBps: 825,
  nextQuoteNumber: 2001,
  quoteFooter: "Thanks!",
  notifyJobReminders: false,
  notifyPayments: true,
  ...over,
})

// 1x1 transparent PNG
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

describe("settings", () => {
  it("the owner saves the profile, quotes and notification settings", async () => {
    const { business, owner } = await createBusiness()
    signInAs(owner)
    const res = await saveSettingsAction(settings())
    expect(res.ok).toBe(true)
    const b = await db.business.findUniqueOrThrow({ where: { id: business.id } })
    expect(b).toMatchObject({
      name: "Dylan Home Services",
      email: "hello@dylan.example",
      timezone: "America/Chicago",
      currency: "CAD",
      taxRateBps: 825,
      nextQuoteNumber: 2001,
      notifyPayments: true,
      notifyJobReminders: false,
    })
    // empty optional fields are stored as null
    expect((await saveSettingsAction(settings({ tagline: "", phone: "" }))).ok).toBe(true)
    expect(await db.business.findUniqueOrThrow({ where: { id: business.id } })).toMatchObject({
      tagline: null,
      phone: null,
    })
  })

  it("refuses a quote number at or below an existing quote, and bad values", async () => {
    const { business, owner } = await createBusiness()
    signInAs(owner)
    const customer = await db.customer.create({ data: { businessId: business.id, name: "A" } })
    await db.quote.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        number: 1500,
        date: new Date("2026-09-01"),
        taxRateBps: 800,
      },
    })
    const low = await saveSettingsAction(settings({ nextQuoteNumber: 1500 }))
    expect(low).toMatchObject({ ok: false, error: "The next quote number must be above Q-1500." })
    expect((await saveSettingsAction(settings({ timezone: "Mars/Olympus" }))).ok).toBe(false)
    expect((await saveSettingsAction(settings({ taxRateBps: 20000 }))).ok).toBe(false)
    expect((await saveSettingsAction(settings({ name: " " }))).ok).toBe(false)
  })

  it("staff can't change settings, but can pick their own appearance", async () => {
    const { business, jordan } = await createBusiness()
    signInAs(jordan)
    expect((await saveSettingsAction(settings())).ok).toBe(false)
    expect((await saveLogoAction({ thumb: PNG, token: null, response: null })).ok).toBe(false)
    expect((await clearAllDataAction("Test Co")).ok).toBe(false)
    expect((await copyPhotosBatchAction()).ok).toBe(false)
    expect((await db.business.findUniqueOrThrow({ where: { id: business.id } })).name).toBe(
      "Test Co"
    )
    expect((await setThemeAction("dark")).ok).toBe(true)
    expect((await setThemeAction("neon")).ok).toBe(false)
    expect((await db.user.findUniqueOrThrow({ where: { id: jordan.id } })).themePreference).toBe(
      "dark"
    )
  })

  it("payment alerts make recorded payments unread in the bell", async () => {
    const { business, owner } = await createBusiness()
    signInAs(owner)
    const customer = await db.customer.create({ data: { businessId: business.id, name: "Sam" } })
    const pay = () =>
      createTransactionAction({
        type: "INCOME",
        category: "JOB_PAYMENT",
        amountCents: 5000,
        date: "2026-09-29",
        description: "Payment",
        customerId: customer.id,
        quoteId: null,
      })
    await pay()
    await db.business.update({ where: { id: business.id }, data: { notifyPayments: true } })
    await pay()
    const rows = await db.activity.findMany({
      where: { businessId: business.id, type: "PAYMENT_RECORDED" },
      orderBy: { createdAt: "asc" },
    })
    expect(rows.map((r) => r.readAt === null)).toEqual([false, true])
  })
})

describe("logo (D15)", () => {
  it("validates the small copy and saves it without storage", async () => {
    expect(parseLogoThumb(PNG).mime).toBe("image/png")
    expect(() => parseLogoThumb("data:image/svg+xml;base64,PHN2Zz4=")).toThrow(/PNG, JPG or WebP/)
    // claims to be a PNG but isn't
    expect(() => parseLogoThumb("data:image/png;base64,aGVsbG8gd29ybGQh")).toThrow(/valid image/)
    const big = `data:image/png;base64,${Buffer.alloc(70_000).toString("base64")}`
    expect(() => parseLogoThumb(big)).toThrow(/too large/)

    const { business, owner } = await createBusiness()
    signInAs(owner)
    expect((await saveLogoAction({ thumb: PNG, token: null, response: null })).ok).toBe(true)
    const b = await db.business.findUniqueOrThrow({ where: { id: business.id } })
    expect(b.logoMime).toBe("image/png")
    expect(b.logoThumb?.byteLength).toBeGreaterThan(0)
    expect((await saveLogoAction({ thumb: PNG, token: "forged", response: null })).ok).toBe(false)
  })
})

describe("team (D3)", () => {
  const member = (over: Record<string, unknown> = {}) => ({
    name: "Sam Ortiz",
    email: "Sam@Example.com",
    role: "STAFF" as const,
    title: "Apprentice",
    avatarColor: "#5B8F6A" as const,
    password: "maple-river-42",
    ...over,
  })

  it("adds a member who signs in with the temporary password and must change it", async () => {
    const { owner } = await createBusiness()
    signInAs(owner)
    const res = await addMemberAction(member())
    if (!res.ok) throw new Error(res.error)
    const u = await db.user.findUniqueOrThrow({ where: { id: res.data.id } })
    expect(u).toMatchObject({
      email: "sam@example.com",
      mustChangePassword: true,
      title: "Apprentice",
    })
    expect(
      await verifyCredentials({ email: "sam@example.com", password: "maple-river-42" })
    ).toEqual({ id: u.id })
    expect((await addMemberAction(member())).ok).toBe(false) // same email
    expect((await addMemberAction(member({ email: "x@y.z", password: "short" }))).ok).toBe(false)
  })

  it("always keeps an owner", async () => {
    const { owner, jordan } = await createBusiness()
    signInAs(owner)
    const keep = {
      name: "Owner",
      role: "STAFF" as const,
      title: null,
      avatarColor: "#2D3436" as const,
    }
    expect(await updateMemberAction(owner.id, keep)).toMatchObject({
      ok: false,
      error: "The business needs at least one owner.",
    })
    // promote Jordan, then the original owner can step down
    expect(
      (await updateMemberAction(jordan.id, { ...keep, name: "Jordan", role: "OWNER" })).ok
    ).toBe(true)
    expect((await updateMemberAction(owner.id, keep)).ok).toBe(true)
    expect((await removeMemberAction(owner.id)).ok).toBe(false) // can't remove yourself
  })

  it("removing keeps history but blocks sign in and frees the email", async () => {
    const { business, owner, jordan } = await createBusiness()
    signInAs(owner)
    await resetMemberPasswordAction(jordan.id, "cedar-stone-11")
    const customer = await db.customer.create({ data: { businessId: business.id, name: "C" } })
    const open = await db.job.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        title: "Open job",
        stage: "SCHEDULED",
        assignees: { connect: [{ id: jordan.id }] },
      },
    })
    const done = await db.job.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        title: "Done job",
        stage: "COMPLETED",
        assignees: { connect: [{ id: jordan.id }] },
      },
    })
    expect((await removeMemberAction(jordan.id)).ok).toBe(true)

    expect(await verifyCredentials({ email: jordan.email, password: "cedar-stone-11" })).toBeNull()
    signInAs(jordan)
    expect(await getCurrentUser()).toBeNull()
    signInAs(owner)
    expect((await listTeam(business.id)).map((m) => m.id)).not.toContain(jordan.id)
    const assigned = async (id: string) =>
      (
        await db.job.findUniqueOrThrow({ where: { id }, include: { assignees: true } })
      ).assignees.map((a) => a.id)
    expect(await assigned(open.id)).toEqual([])
    expect(await assigned(done.id)).toEqual([jordan.id]) // history stays
    // the finished job still saves with them on it, but nobody can newly assign them
    const jobInput = (id: string, title: string, stage: "COMPLETED" | "SCHEDULED") => ({
      customerId: customer.id,
      title,
      category: null,
      stage,
      date: stage === "SCHEDULED" ? "2026-10-05" : "",
      time: "",
      notes: null,
      assigneeIds: [jordan.id],
    })
    expect((await updateJobAction(done.id, jobInput(done.id, "Done job", "COMPLETED"))).ok).toBe(
      true
    )
    expect((await updateJobAction(open.id, jobInput(open.id, "Open job", "SCHEDULED"))).ok).toBe(
      false
    )
    // the email can be used again
    expect((await addMemberAction(member({ email: jordan.email }))).ok).toBe(true)
  })

  it("can't manage another business's members", async () => {
    const a = await createBusiness()
    const b = await createBusiness()
    signInAs(a.owner)
    expect((await removeMemberAction(b.jordan.id)).ok).toBe(false)
    expect((await resetMemberPasswordAction(b.jordan.id, "maple-river-42")).ok).toBe(false)
    expect(
      (
        await updateMemberAction(b.jordan.id, {
          name: "X",
          role: "OWNER",
          title: null,
          avatarColor: "#2D3436",
        })
      ).ok
    ).toBe(false)
  })
})

describe("switching storage provider (D17)", () => {
  it("copies photos in batches, skips broken ones, and wipes the old access when done", async () => {
    const { business, owner } = await createBusiness()
    signInAs(owner)
    const drive = new FakeStorage("GOOGLE_DRIVE")
    const dropbox = new FakeStorage("DROPBOX")
    setStorageOverride((_b, kind?: ProviderKind) => (kind === "GOOGLE_DRIVE" ? drive : dropbox))
    await db.storageConnection.create({
      data: {
        businessId: business.id,
        provider: "DROPBOX",
        accountEmail: "new@example.com",
        encryptedRefreshToken: "unused-in-tests",
        connectedById: owner.id,
        previousProvider: "GOOGLE_DRIVE",
        previousAccountEmail: "old@example.com",
        previousEncryptedRefreshToken: "unused-in-tests",
      },
    })
    const customer = await db.customer.create({ data: { businessId: business.id, name: "C" } })
    const ids: string[] = []
    for (let i = 0; i < 7; i++) {
      const file = await drive.put(
        `JobDesk/Customers/C/General/Before/p${i}.jpg`,
        new Uint8Array([i]),
        "image/jpeg"
      )
      const p = await db.photo.create({
        data: {
          businessId: business.id,
          customerId: customer.id,
          provider: "GOOGLE_DRIVE",
          fileId: i === 3 ? "missing-file" : file.fileId, // one is gone from Drive
          path: file.path,
          mimeType: "image/jpeg",
          stage: "BEFORE",
          uploadedById: owner.id,
        },
      })
      ids.push(p.id)
    }

    const view = await getSettingsView(business.id)
    expect(view.storage.copy).toMatchObject({ remaining: 7, total: 7 })
    expect(view.storage.previous).toEqual({
      provider: "GOOGLE_DRIVE",
      accountEmail: "old@example.com",
    })

    const first = await copyPhotosBatchAction()
    if (!first.ok) throw new Error(first.error)
    expect(first.data).toMatchObject({ copied: 4, failed: [ids[3]], remaining: 3 })
    const second = await copyPhotosBatchAction(first.data.failed)
    if (!second.ok) throw new Error(second.error)
    expect(second.data).toMatchObject({ copied: 2, failed: [], remaining: 1 })

    const moved = await db.photo.findFirstOrThrow({ where: { id: ids[0] } })
    expect(moved.provider).toBe("DROPBOX")
    expect(dropbox.files.get(moved.fileId)?.bytes).toEqual(new Uint8Array([0]))
    expect(dropbox.files.get(moved.fileId)?.path).toBe("JobDesk/Customers/C/General/Before/p0.jpg")
    expect(drive.files.size).toBe(7) // originals are never deleted from the old provider

    // the broken photo keeps the old access alive so it still shows
    let conn = await db.storageConnection.findUniqueOrThrow({ where: { businessId: business.id } })
    expect(conn.previousProvider).toBe("GOOGLE_DRIVE")
    await db.photo.delete({ where: { id: ids[3] } })
    await copyPhotosBatchAction()
    conn = await db.storageConnection.findUniqueOrThrow({ where: { businessId: business.id } })
    expect(conn).toMatchObject({
      previousProvider: null,
      previousEncryptedRefreshToken: null,
      previousAccountEmail: null,
    })
    expect((await getSettingsView(business.id)).storage.copy).toBeNull()
  })
})

describe("data", () => {
  it("clear all data needs the exact name and keeps the team and settings", async () => {
    const a = await createBusiness()
    const b = await createBusiness()
    for (const t of [a, b])
      await seedSampleRecords(db, {
        businessId: t.business.id,
        timezone: t.business.timezone,
        today: "2026-09-29",
        team: { ownerId: t.owner.id, jordanId: t.jordan.id, alexId: t.alex.id },
      })
    signInAs(a.owner)
    expect((await clearAllDataAction("test co")).ok).toBe(false)
    expect(await db.customer.count({ where: { businessId: a.business.id } })).toBeGreaterThan(0)
    expect((await clearAllDataAction("Test Co")).ok).toBe(true)
    for (const model of [
      "customer",
      "job",
      "quote",
      "transaction",
      "activity",
      "catalogItem",
    ] as const) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same query on each model
      expect(await (db[model] as any).count({ where: { businessId: a.business.id } })).toBe(0)
    }
    expect(await db.user.count({ where: { businessId: a.business.id } })).toBe(3)
    // the other business is untouched
    expect(await db.customer.count({ where: { businessId: b.business.id } })).toBeGreaterThan(0)
  })

  it("reload sample data replaces the demo rows and keeps real ones", async () => {
    const { business, owner } = await createBusiness()
    signInAs(owner)
    const real = await db.customer.create({
      data: { businessId: business.id, name: "Real customer" },
    })
    expect((await reloadSampleDataAction()).ok).toBe(true)
    const count = await db.customer.count({ where: { businessId: business.id } })
    expect((await reloadSampleDataAction()).ok).toBe(true)
    expect(await db.customer.count({ where: { businessId: business.id } })).toBe(count)
    expect(await db.customer.findUnique({ where: { id: real.id } })).not.toBeNull()
    expect(await db.quote.count({ where: { businessId: business.id } })).toBe(6)
  })
})
