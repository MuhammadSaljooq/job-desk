"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireUser, type CurrentUser } from "@/lib/auth"
import { ActionError, runAction } from "@/lib/action"
import { zonedInstant } from "@/lib/dates"
import { STAGE_META, type JobStage } from "@/lib/status"
import { jobSchema, stageSchema, type JobInput } from "./schema"
import { relocatePhotos } from "@/features/photos/service"

async function ownJob(businessId: string, jobId: unknown) {
  if (typeof jobId !== "string" || !jobId) throw new ActionError("Job not found.")
  const job = await db.job.findFirst({
    where: { id: jobId, businessId },
    select: { id: true, title: true, stage: true, customerId: true },
  })
  if (!job) throw new ActionError("That job no longer exists.")
  return job
}

/**
 * Validate assignees belong to the same business (never trust ids from the client). Removed
 * members can stay on jobs they already worked on, but can't be newly assigned.
 */
async function checkAssignees(businessId: string, ids: string[], jobId?: string) {
  if (!ids.length) return []
  const unique = [...new Set(ids)]
  const found = await db.user.count({
    where: {
      businessId,
      id: { in: unique },
      OR: [{ removedAt: null }, ...(jobId ? [{ assignedJobs: { some: { id: jobId } } }] : [])],
    },
  })
  if (found !== unique.length) throw new ActionError("Pick team members from your business.")
  return unique
}

async function checkCustomer(businessId: string, customerId: string) {
  const c = await db.customer.findFirst({
    where: { id: customerId, businessId },
    select: { id: true },
  })
  if (!c) throw new ActionError("That customer no longer exists.")
}

function scheduled(user: CurrentUser, date: string, time: string) {
  return date ? zonedInstant(date, time || "09:00", user.timezone) : null
}

function revalidateJob(customerId: string) {
  revalidatePath(`/customers/${customerId}`, "layout")
  revalidatePath("/customers")
  revalidatePath("/")
  revalidatePath("/calendar")
}

export async function createJobAction(input: JobInput) {
  return runAction(async () => {
    const user = await requireUser()
    const data = jobSchema.parse(input)
    await checkCustomer(user.businessId, data.customerId)
    const assignees = await checkAssignees(user.businessId, data.assigneeIds)
    const job = await db.$transaction(async (tx) => {
      const j = await tx.job.create({
        data: {
          businessId: user.businessId,
          customerId: data.customerId,
          title: data.title,
          category: data.category,
          stage: data.stage,
          scheduledAt: scheduled(user, data.date, data.time),
          completedAt: data.stage === "COMPLETED" ? new Date() : null,
          notes: data.notes,
          assignees: { connect: assignees.map((id) => ({ id })) },
        },
      })
      await tx.activity.create({
        data: {
          businessId: user.businessId,
          type: data.stage === "LEAD" ? "NEW_LEAD" : "JOB_CREATED",
          message: data.stage === "LEAD" ? "New lead" : "Job added",
          detail: `${j.title} · ${STAGE_META[j.stage].label}`,
          customerId: j.customerId,
          actorId: user.userId,
          entity: "job",
          entityId: j.id,
          readAt: new Date(),
        },
      })
      return j
    })
    revalidateJob(job.customerId)
    return { id: job.id, customerId: job.customerId }
  })
}

export async function updateJobAction(jobId: string, input: JobInput) {
  return runAction(async () => {
    const user = await requireUser()
    const existing = await ownJob(user.businessId, jobId)
    const data = jobSchema.parse(input)
    if (data.customerId !== existing.customerId) {
      throw new ActionError("A job can't move to another customer.")
    }
    const assignees = await checkAssignees(user.businessId, data.assigneeIds, jobId)
    await db.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          category: data.category,
          stage: data.stage,
          scheduledAt: scheduled(user, data.date, data.time),
          completedAt:
            data.stage === "COMPLETED"
              ? existing.stage === "COMPLETED"
                ? undefined
                : new Date()
              : null,
          notes: data.notes,
          assignees: { set: assignees.map((id) => ({ id })) },
        },
      })
      if (data.stage !== existing.stage) {
        await tx.activity.create({ data: stageActivity(user, existing, data.stage) })
      }
    })
    // Keep the Drive / Dropbox folder named after the job.
    if (data.title !== existing.title) await relocatePhotos(user.businessId, { jobId: existing.id })
    revalidateJob(existing.customerId)
    return { id: existing.id }
  })
}

function stageActivity(
  user: CurrentUser,
  job: { id: string; title: string; customerId: string; stage: JobStage },
  to: JobStage
) {
  return {
    businessId: user.businessId,
    type: "JOB_STAGE_CHANGED" as const,
    message: to === "COMPLETED" ? "Job completed" : `Moved to ${STAGE_META[to].label}`,
    detail: `${job.title}: ${STAGE_META[job.stage].label} → ${STAGE_META[to].label}`,
    customerId: job.customerId,
    actorId: user.userId,
    entity: "job",
    entityId: job.id,
    readAt: new Date(),
  }
}

/** Inline stage select (jobs table, pipeline board). Writes an Activity row. */
export async function changeJobStageAction(jobId: string, stage: JobStage) {
  return runAction(async () => {
    const user = await requireUser()
    const data = stageSchema.parse({ jobId, stage })
    const job = await ownJob(user.businessId, data.jobId)
    if (job.stage === data.stage) return { stage: job.stage }
    await db.$transaction([
      db.job.update({
        where: { id: job.id },
        data: { stage: data.stage, completedAt: data.stage === "COMPLETED" ? new Date() : null },
      }),
      db.activity.create({ data: stageActivity(user, job, data.stage) }),
    ])
    revalidateJob(job.customerId)
    return { stage: data.stage }
  })
}

export async function deleteJobAction(jobId: string) {
  return runAction(async () => {
    const user = await requireUser()
    const job = await ownJob(user.businessId, jobId)
    await db.job.delete({ where: { id: job.id } })
    revalidateJob(job.customerId)
    return { title: job.title }
  })
}
