import { z } from "zod"
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "@/lib/storage/types"

import { PHOTO_STAGES } from "./constants"

export { PHOTO_STAGES, PHOTO_STAGE_LABEL, type PhotoStage } from "./constants"

export const uploadRequestSchema = z.object({
  customerId: z.string().min(1),
  jobId: z.string().min(1).nullable().default(null),
  stage: z.enum(PHOTO_STAGES),
  mimeType: z
    .string()
    .regex(ALLOWED_PHOTO_TYPES, "Only photos can be uploaded (JPEG, PNG, WebP, HEIC)"),
  size: z.number().int().positive().max(MAX_PHOTO_BYTES, "Photos must be 15 MB or smaller"),
})
export type UploadRequest = z.input<typeof uploadRequestSchema>

const caption = z
  .string()
  .trim()
  .max(140, "Keep captions under 140 characters")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()

export const savePhotosSchema = z.object({
  items: z
    .array(
      z.object({
        token: z.string().min(1),
        /** whatever the provider returned to the browser after the direct upload */
        response: z.unknown(),
        width: z.number().int().positive().max(20000).nullable().optional(),
        height: z.number().int().positive().max(20000).nullable().optional(),
        caption,
      })
    )
    .min(1)
    .max(30),
})

export const updatePhotoSchema = z.object({
  caption,
  stage: z.enum(PHOTO_STAGES),
  jobId: z.string().min(1).nullable(),
})
export type UpdatePhotoInput = z.input<typeof updatePhotoSchema>
