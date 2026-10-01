import Link from "next/link"
import { cn } from "cn"
import { STAGE_META, TONE_CLASSES, type JobStage } from "@/lib/status"
import { StageSelect } from "@/features/jobs/components/stage-select"
import type { DashboardJob } from "../queries"

/** Row 3: one column per stage with small job cards; the stage pill on each card is a dropdown. */
export function PipelineBoard({
  columns,
}: {
  columns: { stage: JobStage; count: number; jobs: DashboardJob[] }[]
}) {
  return (
    <section className="min-w-0 rounded-card bg-surface p-5" aria-labelledby="pipeline-title">
      <h2 id="pipeline-title" className="mb-3 text-[16px] font-semibold">
        Job pipeline
      </h2>
      <div className="scroll-strip -mx-1 px-1 pb-1">
        {columns.map((col) => (
          <section
            key={col.stage}
            aria-label={`${STAGE_META[col.stage].label}, ${col.count}`}
            className="flex w-[220px] shrink-0 flex-col rounded-field bg-surface-muted p-2.5 lg:w-auto lg:min-w-0 lg:flex-1"
          >
            <header className="mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    TONE_CLASSES[STAGE_META[col.stage].tone].bar
                  )}
                  aria-hidden
                />
                {STAGE_META[col.stage].label}
              </span>
              <span className="tabular text-[12px] text-text-muted">{col.count}</span>
            </header>
            <ul className="grid gap-2">
              {col.jobs.length === 0 && (
                <li className="px-1 py-3 text-[12px] text-text-subtle">No jobs</li>
              )}
              {col.jobs.map((j) => (
                <li key={j.id} className="rounded-[14px] bg-surface p-3">
                  <Link
                    href={j.href}
                    className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  >
                    <span className="block truncate text-[13.5px] font-semibold">{j.title}</span>
                    <span className="block truncate text-[12px] text-text-muted">
                      {j.customerName}
                      {j.dateLabel !== "No date" ? ` · ${j.dateLabel.replace(/, \d{4}$/, "")}` : ""}
                    </span>
                  </Link>
                  <StageSelect
                    jobId={j.id}
                    jobTitle={j.title}
                    stage={j.stage}
                    overdue={j.overdue}
                    className="mt-2"
                  />
                </li>
              ))}
              {col.count > col.jobs.length && (
                <li className="px-1 text-[12px] text-text-muted">
                  + {col.count - col.jobs.length} more
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </section>
  )
}
