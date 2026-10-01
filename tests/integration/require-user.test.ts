import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/lib/db"
import { requireOwner, requireUser } from "@/lib/auth"
import { markAllActivityReadAction } from "@/features/activity/actions"
import { createBusiness, resetDb, signInAs } from "./helpers"

describe("requireUser / requireOwner", () => {
  beforeEach(resetDb)
  afterEach(() => signInAs(null))

  it("redirects to /login when signed out", async () => {
    signInAs(null)
    await expect(requireUser()).rejects.toMatchObject({ digest: expect.stringContaining("/login") })
  })

  it("loads role and business fresh from the database", async () => {
    const { business, jordan } = await createBusiness()
    signInAs(jordan)
    const u = await requireUser()
    expect(u).toMatchObject({ userId: jordan.id, businessId: business.id, role: "STAFF" })
    await expect(requireOwner()).rejects.toThrow(/Only the owner/)
  })

  it("treats a deleted user as signed out", async () => {
    const { jordan } = await createBusiness()
    signInAs(jordan)
    await db.user.delete({ where: { id: jordan.id } })
    await expect(requireUser()).rejects.toMatchObject({ digest: expect.stringContaining("/login") })
  })
})

describe("markAllActivityReadAction", () => {
  beforeEach(resetDb)
  afterEach(() => signInAs(null))

  it("only touches the signed-in user's business", async () => {
    const a = await createBusiness()
    const b = await createBusiness()
    const mk = (businessId: string) =>
      db.activity.create({
        data: { businessId, type: "NOTE", message: "x", entity: "customer", entityId: "c" },
      })
    await mk(a.business.id)
    await mk(a.business.id)
    await mk(b.business.id)
    signInAs(a.jordan)
    const res = await markAllActivityReadAction()
    expect(res).toEqual({ ok: true, data: { count: 2 } })
    expect(await db.activity.count({ where: { businessId: b.business.id, readAt: null } })).toBe(1)
  })
})
