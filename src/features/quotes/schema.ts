import { z } from "zod"
import { QUOTE_STATUSES } from "@/lib/status"

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")

export const quoteLineSchema = z.object({
  catalogItemId: z.string().min(1).nullable().default(null),
  name: z
    .string()
    .trim()
    .min(1, "Every line needs a name")
    .max(160, "Keep line names under 160 characters"),
  category: z.string().trim().max(60).nullable().default(null),
  unit: z.string().trim().max(20).nullable().default(null),
  /** up to 2 decimals (2.5 hours) */
  qty: z
    .number()
    .positive("Quantity must be more than 0")
    .max(99999.99, "That quantity is too large")
    .refine(
      (n) => Math.round(n * 100) === n * 100 || Math.abs(Math.round(n * 100) - n * 100) < 1e-6,
      {
        message: "Use at most 2 decimals",
      }
    ),
  /** null = not priced yet */
  unitPriceCents: z.number().int().min(0, "Prices can't be negative").max(99_999_999).nullable(),
})
export type QuoteLineInput = z.input<typeof quoteLineSchema>

/** Everything the builder autosaves. */
export const quoteSaveSchema = z.object({
  /** the updatedAt the editor last saw: stale saves are refused instead of overwriting */
  version: z.string().min(1),
  customerId: z.string().min(1, "Pick a customer"),
  jobId: z.string().min(1).nullable(),
  title: z
    .string()
    .trim()
    .max(120, "Keep the title under 120 characters")
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  date: day,
  taxRateBps: z.number().int().min(0).max(10000),
  discountCents: z.number().int().min(0).max(99_999_999),
  notes: z
    .string()
    .trim()
    .max(4000)
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  lines: z.array(quoteLineSchema).max(200, "A quote can have up to 200 lines"),
})
export type QuoteSaveInput = z.input<typeof quoteSaveSchema>

export const createQuoteSchema = z.object({
  customerId: z.string().min(1, "Pick a customer"),
  jobId: z.string().min(1).nullable().default(null),
})

export const QUOTE_FILTERS = ["ALL", ...QUOTE_STATUSES] as const
export type QuoteFilter = (typeof QUOTE_FILTERS)[number]

export { isEditable } from "./status"

export function quoteNumberLabel(n: number) {
  return `Q-${n}`
}
