import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { FakeStorage } from "@/lib/storage/fake"
import { setStorageOverride } from "@/lib/storage"
import { startUpload } from "@/features/photos/service"
import { deletePhotoAction, savePhotosAction, updatePhotoAction } from "@/features/photos/actions"
import { updateCustomerAction } from "@/features/customers/actions"
import { updateJobAction } from "@/features/jobs/actions"
import { latestPhotos, listCustomerPhotos } from "@/features/photos/queries"
import { createBusiness, resetDb, signInAs } from "./helpers"

let fake: FakeStorage

beforeEach(async () => {
  await resetDb()
  fake = new FakeStorage()
  setStorageOverride(() => fake)
})
afterEach(() => {
  signInAs(null)
  setStorageOverride(null)
})

async function setup() {
  const t = await createBusiness()
  const customer = await db.customer.create({
    data: { businessId: t.business.id, name: "Oakwood Property Mgmt" },
  })
  const job = await db.job.create({
    data: { businessId: t.business.id, customerId: customer.id, title: "Unit 12 turnover" },
  })
  signInAs(t.jordan)
  return { ...t, customer, job }
}

/** The whole flow as the browser does it: session -> direct upload -> save. */
async function upload(
  customerId: string,
  jobId: string | null,
  stage: "BEFORE" | "DURING" | "AFTER",
  n = 1
) {
  const user = await requireUser()
  const items = []
  for (let i = 0; i < n; i++) {
    const { upload, token } = await startUpload(
      user,
      { customerId, jobId, stage, mimeType: "image/jpeg", size: 1234 },
      "http://localhost:3210"
    )
    const ref = upload.url.replace("fake://upload/", "")
    const response = fake.receive(ref, new Uint8Array([1, 2, 3]))
    items.push({
      token,
      response,
      width: 1600,
      height: 1200,
      caption: i === 0 ? "Hole behind the door" : "",
    })
  }
  return savePhotosAction({ items })
}

describe("photo uploads", () => {
  it("uploads straight to storage and stores only provider, fileId and path", async () => {
    const { customer, job, business } = await setup()
    const res = await upload(customer.id, job.id, "DURING", 2)
    expect(res).toEqual({ ok: true, data: { count: 2 } })
    const photos = await db.photo.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "asc" },
    })
    expect(photos).toHaveLength(2)
    expect(photos[0]).toMatchObject({
      provider: "GOOGLE_DRIVE",
      stage: "DURING",
      jobId: job.id,
      caption: "Hole behind the door",
    })
    expect(photos[1].caption).toBeNull()
    expect(photos[0].path).toMatch(
      /^JobDesk\/Customers\/Oakwood Property Mgmt\/Unit 12 turnover\/During\/\d{4}-\d{2}-\d{2}_\d{4}_\w+\.jpg$/
    )
    expect(fake.files.get(photos[0].fileId)?.path).toBe(photos[0].path)
    // one activity for the batch
    const acts = await db.activity.findMany({
      where: { businessId: business.id, type: "PHOTO_UPLOADED" },
    })
    expect(acts.map((a) => a.detail)).toEqual(["2 During photos added to Unit 12 turnover"])
  })

  it("rejects non-images, big files, other businesses and wrong jobs", async () => {
    const { customer, business } = await setup()
    const user = await requireUser()
    const base = { customerId: customer.id, jobId: null, stage: "BEFORE" as const, size: 10 }
    await expect(startUpload(user, { ...base, mimeType: "application/pdf" }, "x")).rejects.toThrow()
    await expect(
      startUpload(user, { ...base, mimeType: "image/jpeg", size: 16 * 1024 * 1024 }, "x")
    ).rejects.toThrow()
    const other = await createBusiness()
    const theirs = await db.customer.create({
      data: { businessId: other.business.id, name: "Theirs" },
    })
    await expect(
      startUpload(user, { ...base, customerId: theirs.id, mimeType: "image/jpeg" }, "x")
    ).rejects.toThrow(/no longer exists/)
    const otherJob = await db.job.create({
      data: {
        businessId: business.id,
        customerId: (await db.customer.create({ data: { businessId: business.id, name: "B" } })).id,
        title: "B job",
      },
    })
    await expect(
      startUpload(user, { ...base, jobId: otherJob.id, mimeType: "image/jpeg" }, "x")
    ).rejects.toThrow(/isn't on this customer/)
  })

  it("refuses tokens from another user and unfinished uploads", async () => {
    const { customer, alex } = await setup()
    const user = await requireUser()
    const { token, upload: up } = await startUpload(
      user,
      { customerId: customer.id, jobId: null, stage: "AFTER", mimeType: "image/png", size: 5 },
      "x"
    )
    // not uploaded yet
    expect((await savePhotosAction({ items: [{ token, response: { id: "nope" } }] })).ok).toBe(
      false
    )
    fake.receive(up.url.replace("fake://upload/", ""), new Uint8Array([9]))
    signInAs(alex)
    const res = await savePhotosAction({ items: [{ token, response: { id: "file-2" } }] })
    expect(res).toEqual({ ok: false, error: "That upload expired. Please try again." })
  })

  it("moves the file when the stage or job changes, and on renames", async () => {
    const { customer, job } = await setup()
    await upload(customer.id, null, "BEFORE")
    const p = await db.photo.findFirstOrThrow({ where: { customerId: customer.id } })
    expect(p.path).toContain("/General/Before/")
    await updatePhotoAction(p.id, { caption: "Patch set", stage: "DURING", jobId: job.id })
    const moved = await db.photo.findUniqueOrThrow({ where: { id: p.id } })
    expect(moved.path).toContain("/Unit 12 turnover/During/")
    expect(moved.caption).toBe("Patch set")
    expect(fake.files.get(moved.fileId)?.path).toBe(moved.path)

    await updateJobAction(job.id, { customerId: customer.id, title: "Unit 12: turnover" })
    expect((await db.photo.findUniqueOrThrow({ where: { id: p.id } })).path).toContain(
      "/Unit 12- turnover/During/"
    )
    await updateCustomerAction(customer.id, { name: "Oakwood PM" })
    const renamed = await db.photo.findUniqueOrThrow({ where: { id: p.id } })
    expect(renamed.path).toMatch(/^JobDesk\/Customers\/Oakwood PM\/Unit 12- turnover\/During\//)
    expect(fake.files.get(renamed.fileId)?.path).toBe(renamed.path)
  })

  it("deletes the file in storage too", async () => {
    const { customer } = await setup()
    await upload(customer.id, null, "AFTER")
    const p = await db.photo.findFirstOrThrow({ where: { customerId: customer.id } })
    expect(fake.files.has(p.fileId)).toBe(true)
    expect((await deletePhotoAction(p.id)).ok).toBe(true)
    expect(fake.files.has(p.fileId)).toBe(false)
    expect(await db.photo.count({ where: { id: p.id } })).toBe(0)
  })

  it("lists photos and the latest six for the dashboard", async () => {
    const { customer, business } = await setup()
    await upload(customer.id, null, "BEFORE", 4)
    await upload(customer.id, null, "AFTER", 4)
    expect(await listCustomerPhotos(business.id, customer.id)).toHaveLength(8)
    const latest = await latestPhotos(business.id)
    expect(latest).toHaveLength(6)
    expect(latest[0].stage).toBe("AFTER")
  })

  it("explains what to do when no storage is connected", async () => {
    const { customer } = await setup()
    setStorageOverride(() => null)
    const user = await requireUser()
    await expect(
      startUpload(
        user,
        { customerId: customer.id, jobId: null, stage: "BEFORE", mimeType: "image/jpeg", size: 1 },
        "x"
      )
    ).rejects.toThrow(/Ask the owner to connect photo storage/)
  })
})
