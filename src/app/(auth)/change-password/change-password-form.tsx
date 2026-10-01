"use client"

import { useActionState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/form-field"
import { changePasswordAction } from "@/features/auth/actions"

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined)
  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4" noValidate>
      <FormField
        label="New password"
        htmlFor="password"
        error={state?.fieldErrors?.password}
        hint="At least 8 characters"
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          autoFocus
        />
      </FormField>
      <FormField label="Repeat it" htmlFor="confirm" error={state?.fieldErrors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
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
        Save password
      </Button>
    </form>
  )
}
