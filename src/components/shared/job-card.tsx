import Link from "next/link"
import { Clock } from "lucide-react"
import { cn } from "cn"
import { AvatarStack } from "./initials-avatar"
import { STAGE_META, TONE_CLASSES, jobTone, type JobStage } from "@/lib/status"

export type JobCardProps = {
  dateLabel: string
  title: string
  category?: string | null
  stage: JobStage
  overdue?: boolean
  assignees: { name: string; color?: string | null }[]
  chip: string
  href?: string
  menu?: React.ReactNode
  className?: string
}

/** Pastel job card: date chip, title, category, "NN% Stage", progress bar, crew, status chip. */
export function JobCard({
  dateLabel,
  title,
  category,
  stage,
  overdue = false,
  assignees,
  chip,
  href,
  menu,
  className,
}: JobCardProps) {
  const tone = TONE_CLASSES[jobTone(stage, overdue)]
  const { progress, label } = STAGE_META[stage]

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-6 items-center rounded-full bg-surface px-2.5 text-[11.5px] font-semibold text-text">
          {dateLabel}
        </span>
        {menu}
      </div>

      <div className="mt-2.5 flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-[17px] leading-tight font-bold text-text">{title}</h3>
        <Clock className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="min-w-0 truncate text-text-muted">{category ?? "General"}</span>
        <span className="shrink-0 text-text-muted">
          <b className="font-bold text-text">{progress}%</b> {overdue ? "Overdue" : label}
        </span>
      </div>

      <div
        className={cn("mt-2.5 h-1 w-full overflow-hidden rounded-full", tone.track)}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}, ${progress}%`}
      >
        <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <AvatarStack people={assignees} />
        <span className="inline-flex h-7 items-center rounded-full bg-surface px-3 text-[12.5px] font-semibold text-text">
          {chip}
        </span>
      </div>
    </>
  )

  const cls = cn(
    "block min-w-[260px] flex-1 rounded-card px-5 pt-[14px] pb-4 text-left transition-[filter] outline-none",
    tone.card,
    href && "hover:brightness-[0.98] focus-visible:ring-2 focus-visible:ring-ink",
    className
  )

  return href ? (
    <Link href={href} className={cls} aria-label={`${title}, ${overdue ? "overdue" : label}`}>
      {body}
    </Link>
  ) : (
    <article className={cls}>{body}</article>
  )
}
