import { z } from "zod"

export const CUSTOMER_TYPES = ["HOMEOWNER", "LANDLORD", "BUSINESS"] as const
export const CUSTOMER_TYPE_LABEL: Record<(typeof CUSTOMER_TYPES)[number], string> = {
  HOMEOWNER: "Homeowner",
  LANDLORD: "Landlord",
  BUSINESS: "Business",
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()

/** Shared by the customer dialog (React Hook Form) and the server actions. */
export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name or company")
    .max(120, "Keep it under 120 characters"),
  type: z.enum(CUSTOMER_TYPES).default("HOMEOWNER"),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address")
    .transform((v) => (v === "" ? null : v.toLowerCase()))
    .nullable()
    .optional(),
  address: optionalText(240),
  accessNotes: optionalText(500),
  preferredContact: optionalText(120),
  notes: optionalText(2000),
  status: z.enum(["ACTIVE", "PAST"]).default("ACTIVE"),
})

export type CustomerInput = z.input<typeof customerSchema>
export type CustomerData = z.output<typeof customerSchema>

export { CUSTOMER_FILTERS, CUSTOMER_FILTER_LABEL, type CustomerFilter } from "./constants"

export const noteSchema = z.object({
  body: z.string().trim().min(1, "Write a note first").max(2000, "Keep it under 2000 characters"),
})
