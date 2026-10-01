import { z } from "zod"
import { CATALOG_UNITS } from "./sample-catalog"

export const itemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter the item or service name")
    .max(120, "Keep it under 120 characters"),
  /** an existing category name, or a new one to create */
  category: z
    .string()
    .trim()
    .min(1, "Pick or type a category")
    .max(60, "Keep it under 60 characters"),
  unit: z.enum(CATALOG_UNITS),
})
export type ItemInput = z.input<typeof itemSchema>

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Type a category name").max(60, "Keep it under 60 characters"),
})

export const importSchema = z.object({
  rows: z
    .array(
      z.object({
        category: z.string().trim().min(1).max(60),
        name: z.string().trim().min(1).max(120),
        unit: z.enum(CATALOG_UNITS),
      })
    )
    .min(1, "Nothing to import")
    .max(2000, "Import up to 2000 items at a time"),
})
