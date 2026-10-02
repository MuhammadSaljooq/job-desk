import { z } from "zod"
import { passwordSchema } from "@/features/auth/credentials-schema"

export const CURRENCIES = [
  { code: "USD", label: "$ US Dollar" },
  { code: "CAD", label: "$ Canadian Dollar" },
  { code: "AUD", label: "$ Australian Dollar" },
  { code: "GBP", label: "£ British Pound" },
  { code: "EUR", label: "€ Euro" },
] as const

// The common North American zones first; any IANA zone the runtime knows is accepted.
export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Australia/Sydney",
] as const

export function isTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .transform((v) => (v === "" ? null : v))
    .nullable()

/** One "Save settings" covers the business profile, quotes and notification cards. */
export const settingsSchema = z.object({
  name: z.string().trim().min(1, "Add your business name").max(80, "Keep it under 80 characters"),
  tagline: optionalText(80),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email")
    .transform((v) => (v === "" ? null : v.toLowerCase()))
    .nullable(),
  address: optionalText(200),
  timezone: z.string().refine(isTimezone, "Pick a timezone"),
  currency: z.enum(CURRENCIES.map((c) => c.code) as [string, ...string[]]),
  taxRateBps: z
    .number({ message: "Enter a tax rate like 8 or 8.25" })
    .int()
    .min(0, "Tax can't be negative")
    .max(10000, "Tax can't be over 100%"),
  nextQuoteNumber: z
    .number({ message: "Enter a whole number" })
    .int("Enter a whole number")
    .min(1, "Start at 1 or more")
    .max(9_999_999, "That number is too large"),
  quoteFooter: optionalText(500),
  notifyJobReminders: z.boolean(),
  notifyPayments: z.boolean(),
})
export type SettingsInput = z.input<typeof settingsSchema>

export const AVATAR_COLORS = [
  "#C9825B",
  "#4F7FBF",
  "#5B8F6A",
  "#B05D8E",
  "#7A6BC2",
  "#3F8F93",
  "#D09A36",
  "#2D3436",
] as const

const memberFields = {
  name: z.string().trim().min(1, "Add a name").max(60, "Keep it under 60 characters"),
  role: z.enum(["OWNER", "STAFF"]),
  title: optionalText(40),
  avatarColor: z.enum(AVATAR_COLORS),
}

/** D3: the owner creates the account with a temporary password (no email service). */
export const newMemberSchema = z.object({
  ...memberFields,
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(120),
  password: passwordSchema,
})
export type NewMemberInput = z.input<typeof newMemberSchema>

export const updateMemberSchema = z.object(memberFields)
export type UpdateMemberInput = z.input<typeof updateMemberSchema>

export const themeSchema = z.enum(["system", "light", "dark"])
