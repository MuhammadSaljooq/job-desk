"use server"

import { AuthError as NextAuthError } from "next-auth"
import { redirect } from "next/navigation"
import { z } from "zod"
import { signIn, signOut } from "@/auth"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { hashPassword, passwordSchema, signInSchema } from "./credentials"
import { safeNextPath } from "./safe-next"

export type FormState =
  | {
      error?: string
      fieldErrors?: Record<string, string>
      /** echoed back so the form keeps what was typed (React resets forms after an action) */
      values?: Record<string, string>
    }
  | undefined

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") }
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message
    return { fieldErrors, values }
  }
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeNextPath(formData.get("next")),
    })
  } catch (err) {
    // signIn throws a redirect on success; only Auth.js errors mean the sign-in failed.
    if (err instanceof NextAuthError) {
      return { error: "That email and password don't match. Check them and try again.", values }
    }
    throw err
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" })
}

const changePasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "The two passwords don't match",
  })

/** First sign in for owner-created accounts (D3), and voluntary changes later. */
export async function changePasswordAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser()
  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message
    return { fieldErrors }
  }
  await db.user.update({
    where: { id: user.userId },
    data: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false },
  })
  redirect("/")
}
