// Plain constants shared by client components and schema.ts. Kept free of zod so pages that
// only need labels (the dashboard, galleries) don't ship the validation library.

export const PHOTO_STAGES = ["BEFORE", "DURING", "AFTER"] as const
export type PhotoStage = (typeof PHOTO_STAGES)[number]
export const PHOTO_STAGE_LABEL: Record<PhotoStage, string> = {
  BEFORE: "Before",
  DURING: "During",
  AFTER: "After",
}
