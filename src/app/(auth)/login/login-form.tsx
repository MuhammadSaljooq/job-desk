"use client"

import { useActionState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/form-field"
import { signInAction } from "@/features/auth/actions"

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, undefined)

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormField label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          required
          defaultValue={state?.values?.email}
          aria-invalid={!!state?.fieldErrors?.email || undefined}
        />
      </FormField>
      <FormField label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={!!state?.fieldErrors?.password || undefined}
        />
      </FormField>
      {state?.error && (
        <p
          role="alert"
          data-testid="form-error"
          className="rounded-field bg-blush px-3.5 py-2.5 text-[13px] text-blush-ink"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}
