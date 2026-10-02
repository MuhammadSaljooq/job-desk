import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export type Role = "OWNER" | "STAFF"

export type CurrentUser = {
  userId: string
  businessId: string
  role: Role
  name: string
  email: string
  avatarColor: string
  title: string | null
  mustChangePassword: boolean
  themePreference: string
  timezone: string
  currency: string
}

export class AuthError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "FORBIDDEN",
    message: string
  ) {
    super(message)
  }
}

/**
 * The signed-in user, loaded fresh from the database (so a removed account or changed role
 * takes effect immediately). Cached per request. Returns null when nobody is signed in.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      businessId: true,
      role: true,
      name: true,
      email: true,
      avatarColor: true,
      title: true,
      mustChangePassword: true,
      removedAt: true,
      themePreference: true,
      business: { select: { timezone: true, currency: true } },
    },
  })
  if (!user || user.removedAt) return null
  return {
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
    name: user.name,
    email: user.email,
    avatarColor: user.avatarColor,
    title: user.title,
    mustChangePassword: user.mustChangePassword,
    themePreference: user.themePreference,
    timezone: user.business.timezone,
    currency: user.business.currency,
  }
})

/**
 * Every server action and query starts with this. Pages: redirects to /login when signed
 * out. Server actions: same (Next turns the redirect into a navigation).
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

/** Owner-only operations (Settings, deleting customers and transactions). Throws for staff. */
export async function requireOwner(): Promise<CurrentUser> {
  const user = await requireUser()
  assertOwner(user)
  return user
}

export function assertOwner(user: Pick<CurrentUser, "role">) {
  if (user.role !== "OWNER") {
    throw new AuthError("FORBIDDEN", "Only the owner can do that.")
  }
}

export function canManage(user: Pick<CurrentUser, "role">) {
  return user.role === "OWNER"
}
