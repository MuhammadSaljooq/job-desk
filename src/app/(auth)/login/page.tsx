import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { safeNextPath } from "@/features/auth/safe-next"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams
  const nextPath = safeNextPath(next)
  // Already signed in with a valid session: skip the form.
  if (await getCurrentUser()) redirect(nextPath)

  return (
    <section className="rounded-card bg-surface p-6 sm:p-7">
      <h1 className="text-[22px] font-semibold text-text">Sign in</h1>
      <p className="mt-1 text-[13px] text-text-muted">
        Customers, jobs, photos, quotes and books in one place.
      </p>
      <LoginForm next={nextPath} />
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-5 rounded-field bg-surface-muted px-3.5 py-2.5 text-[12px] text-text-muted">
          Demo: <b className="text-text">owner@jobdesk.test</b> /{" "}
          <b className="text-text">jobdesk123</b>
        </p>
      )}
    </section>
  )
}
