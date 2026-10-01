import "server-only"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { z } from "zod"
import { AuthError } from "@/lib/auth"

/** Every mutation returns this shape (CLAUDE.md > Code rules). */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> }

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })

/** A known, user-facing failure ("That customer no longer exists"). */
export class ActionError extends Error {}

/** Flatten Zod issues into { field: firstMessage } for the form. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_"
    if (!out[key]) out[key] = issue.message
  }
  return out
}

/**
 * Runs an action body and converts failures into ActionResult. Redirects (requireUser when
 * signed out, or an explicit redirect) are re-thrown so Next can handle them.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn())
  } catch (err) {
    if (isRedirectError(err)) throw err
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        error: "Please check the highlighted fields.",
        fieldErrors: fieldErrorsOf(err),
      }
    }
    if (err instanceof AuthError || err instanceof ActionError) {
      return { ok: false, error: err.message }
    }
    console.error("[action]", err)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}
