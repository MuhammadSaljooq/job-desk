import "server-only"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password").max(200),
})

// Compared against when the email is unknown, so a wrong email and a wrong password take
// the same time and can't be told apart.
const DUMMY_HASH = "$2b$10$ICCbW6/76oP3PwgGDBjBOeziuuxx3RozxcMBAs1vY3Z2LFQP4UJS."

/** Returns the user id when the email + password are valid, otherwise null. */
export async function verifyCredentials(input: unknown): Promise<{ id: string } | null> {
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) return null
  const { email, password } = parsed.data
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, removedAt: true },
  })
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
  // removed team members keep their history but can no longer sign in
  if (!user?.passwordHash || !ok || user.removedAt) return null
  return { id: user.id }
}

export { PASSWORD_MIN, passwordSchema } from "./credentials-schema"

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}
