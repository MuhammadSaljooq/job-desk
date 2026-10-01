"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Camera, Pencil, Trash2, Wrench } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { AvatarStack } from "@/components/shared/initials-avatar"
import { RowAction } from "@/components/shared/detail-row"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import type { JobRow } from "./job-list-types"
import { useProfileDialogs, NewJobButton } from "@/features/customers/components/profile-dialogs"
import { deleteJobAction } from "../actions"
import { StageSelect } from "./stage-select"

export type { JobRow }

/** Jobs tab: every job with inline stage select, date, crew, notes, photos, edit and delete. */
export function JobsList({ jobs }: { jobs: JobRow[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const { editJob } = useProfileDialogs()
  const [deleting, setDeleting] = useState<JobRow | null>(null)
  const highlight = params.get("job")

  useEffect(() => {
    if (!highlight) return
    document
      .getElementById(`job-${highlight}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [highlight])

  if (jobs.length === 0) {
    return (
      <section className="rounded-card bg-surface">
        <EmptyState
          icon={<Wrench />}
          title="No jobs for this customer yet"
          description="Add a job to schedule it and track it from lead to completed."
          action={<NewJobButton variant="pill" />}
        />
      </section>
    )
  }

  return (
    <section className="rounded-card bg-surface p-2 sm:p-3" aria-label="Jobs">
      <ul className="flex flex-col">
        {jobs.map((j) => (
          <li
            key={j.id}
            id={`job-${j.id}`}
            className={cn(
              "grid scroll-mt-24 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-[16px] border-b border-divider px-3 py-3.5 last:border-b-0 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_auto_auto_auto_auto]",
              highlight === j.id && "bg-surface-muted ring-2 ring-ink/70"
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-text">{j.title}</p>
              <p className="truncate text-[12px] text-text-muted">
                {j.category ?? "General"}
                {j.notes && <span className="text-text-subtle"> · {j.notes}</span>}
              </p>
            </div>
            <p
              className={cn(
                "text-[13px] md:order-none",
                j.overdue ? "font-semibold text-blush-ink" : "text-text"
              )}
            >
              {j.when ?? <span className="text-text-subtle">Not scheduled</span>}
            </p>
            <StageSelect jobId={j.id} jobTitle={j.title} stage={j.stage} overdue={j.overdue} />
            <AvatarStack
              people={j.assignees.map((a) => ({ name: a.name, color: a.color }))}
              showAdd={false}
            />
            <span
              className="inline-flex items-center gap-1 text-[12.5px] text-text-muted"
              aria-label={`${j.photoCount} photos`}
            >
              <Camera className="size-3.5" aria-hidden /> {j.photoCount}
            </span>
            <div className="flex justify-end">
              <RowAction
                label={`Edit ${j.title}`}
                onClick={() =>
                  editJob({
                    id: j.id,
                    title: j.title,
                    category: j.category ?? "",
                    stage: j.stage,
                    date: j.date,
                    time: j.time,
                    notes: j.notes ?? "",
                    assigneeIds: j.assignees.map((a) => a.id),
                  })
                }
              >
                <Pencil />
              </RowAction>
              <RowAction label={`Delete ${j.title}`} onClick={() => setDeleting(j)}>
                <Trash2 />
              </RowAction>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.title}”?`}
        description="Its photos stay with the customer under General. Quotes stay too, without a job. This can't be undone."
        confirmLabel="Delete job"
        onConfirm={async () => {
          if (!deleting) return
          const res = await deleteJobAction(deleting.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success(`Deleted ${res.data.title}`)
          router.refresh()
        }}
      />
    </section>
  )
}
