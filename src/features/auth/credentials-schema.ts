import { z } from "zod"

// Shared by the server (credentials.ts) and client forms (team member dialog).
export const PASSWORD_MIN = 8

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(200, "That password is too long")
