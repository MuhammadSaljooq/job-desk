import { z } from "zod"

import { PASSWORD_MIN } from "./password-rules"

// Shared by the server (credentials.ts) and the team actions.
export { PASSWORD_MIN }

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(200, "That password is too long")
