"use client"

import { useOptimistic, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "cn"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { JOB_STAGES, STAGE_META, TONE_CLASSES, jobTone, type JobStage } from "@/lib/status"
import { changeJobStageAction } from "../actions"

/** A stage pill that is also a dropdown (jobs table, pipeline board). Optimistic. */
export function StageSelect({
  jobId,
  jobTitle,
  stage,
  overdue = false,
  className,
}: {
  jobId: string
  jobTitle: string
  stage: JobStage
  overdue?: boolean
  className?: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic(stage)
  const shownOverdue = overdue && optimistic === stage

  return (
    <Select
      value={optimistic}
      onValueChange={(next) =>
        start(async () => {
          setOptimistic(next as JobStage)
          const res = await changeJobStageAction(jobId, next as JobStage)
          if (!res.ok) {
            toast.error(res.error)
            return
          }
          toast.success(`${jobTitle} moved to ${STAGE_META[next as JobStage].label}`)
          router.refresh()
        })
      }
    >
      <SelectTrigger
        size="sm"
        aria-label={`Stage for ${jobTitle}`}
        className={cn(
          "h-7! gap-1 rounded-full! px-2.5! text-[11.5px]! font-semibold",
          TONE_CLASSES[jobTone(optimistic, shownOverdue)].pill,
          pending && "opacity-70",
          className
        )}
      >
        {shownOverdue ? "Overdue" : STAGE_META[optimistic].label}
        <span className="sr-only">, change stage</span>
      </SelectTrigger>
      <SelectContent>
        {JOB_STAGES.map((s) => (
          <SelectItem key={s} value={s}>
            <span className={cn("size-2 rounded-full", TONE_CLASSES[STAGE_META[s].tone].dot)} />
            {STAGE_META[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
