import { z } from "zod"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, categoryMatchesType } from "./categories"

export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    category: z.enum([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]),
    amountCents: z
      .number({ message: "Enter an amount" })
      .int()
      .positive("Enter an amount above $0.00")
      .max(99_999_999, "That amount is too large"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    description: z
      .string()
      .trim()
      .min(1, "Add a short description")
      .max(200, "Keep it under 200 characters"),
    customerId: z.string().min(1).nullable().default(null),
    quoteId: z.string().min(1).nullable().default(null),
  })
  .refine((v) => categoryMatchesType(v.type, v.category), {
    path: ["category"],
    message: "Pick a category for this type",
  })
  .refine((v) => !(v.type === "EXPENSE" && v.quoteId), {
    path: ["quoteId"],
    message: "Only payments can be linked to a quote",
  })

export type TransactionInput = z.input<typeof transactionSchema>
