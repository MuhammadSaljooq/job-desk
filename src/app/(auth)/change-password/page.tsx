import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { ChangePasswordForm } from "./change-password-form"

export const metadata: Metadata = { title: "Choose a password" }

export default async function ChangePasswordPage() {
  const user = await requireUser()
  return (
    <section className="rounded-card bg-surface p-6 sm:p-7">
      <h1 className="text-[22px] font-semibold text-text">
        {user.mustChangePassword ? "Choose your password" : "Change password"}
      </h1>
      <p className="mt-1 text-[13px] text-text-muted">
        {user.mustChangePassword
          ? `Welcome, ${user.name.split(" ")[0]}. Replace the temporary password you were given.`
          : "Use at least 8 characters."}
      </p>
      <ChangePasswordForm />
    </section>
  )
}
