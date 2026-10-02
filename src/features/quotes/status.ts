// Plain helpers shared by client components and schema.ts (no zod in the client bundle).

/** Editing lines is allowed while the quote is a draft or has been sent. */
export function isEditable(status: string) {
  return status === "DRAFT" || status === "SENT"
}
