import { z } from "zod"
import { JOB_STAGES } from "@/lib/status"

/** Categories offered in the job dialog (free text is allowed too). */
export const JOB_CATEGORIES = [
  "TV & Mounting",
  "Electrical",
  "Plumbing",
  "Drywall & Paint",
  "Carpentry",
  "Painting",
  "Assembly",
  "Flooring & Tile",
  "Repairs",
  "General",
] as const

const day = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a date")
const time = z
  .string()
  .trim()
  .refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Pick a time")

export const jobSchema = z
  .object({
    customerId: z.string().min(1, "Pick a customer"),
    title: z
      .string()
      .trim()
      .min(1, "Give the job a title")
      .max(120, "Keep it under 120 characters"),
    category: z
      .string()
      .trim()
      .max(60)
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    stage: z.enum(JOB_STAGES).default("LEAD"),
    /** business-local day, "" for not scheduled */
    date: day.default(""),
    /** business-local "HH:mm", defaults to 09:00 when a date is set */
    time: time.default(""),
    assigneeIds: z.array(z.string()).max(20).default([]),
    notes: z
      .string()
      .trim()
      .max(2000)
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
  })
  .refine((v) => !(v.time && !v.date), { path: ["date"], message: "Pick a date for that time" })
  .refine((v) => !((v.stage === "SCHEDULED" || v.stage === "IN_PROGRESS") && !v.date), {
    path: ["date"],
    message: "Scheduled jobs need a date",
  })

export type JobInput = z.input<typeof jobSchema>
export type JobData = z.output<typeof jobSchema>

export const stageSchema = z.object({ jobId: z.string().min(1), stage: z.enum(JOB_STAGES) })
