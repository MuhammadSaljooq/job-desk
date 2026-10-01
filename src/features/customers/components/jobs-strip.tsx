"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { JobCard, type JobCardProps } from "@/components/shared/job-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StagePill } from "@/components/shared/status-pill"
import { NewJobButton } from "./profile-dialogs"
import { Wrench } from "lucide-react"

export type StripJob = JobCardProps & { id: string }

/** "Sarah's jobs ▾" pill (jump to a job) above a sideways-scrolling strip of JobCards. */
export function JobsStrip({ label, jobs }: { label: string; jobs: StripJob[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-[14px] flex items-center justify-between gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!jobs.length}
            className="inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-ink-foreground outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-default"
          >
            {label} <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>Jump to a job</DropdownMenuLabel>
            {jobs.map((j) => (
              <DropdownMenuItem key={j.id} asChild>
                <Link href={`?job=${j.id}#job-${j.id}`} scroll={false} className="justify-between">
                  <span className="truncate">{j.title}</span>
                  <StagePill stage={j.stage} overdue={j.overdue} />
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <NewJobButton />
      </div>
      {jobs.length === 0 ? (
        <div className="rounded-card bg-surface">
          <EmptyState
            icon={<Wrench />}
            title="No jobs yet"
            description="Add the first job to put it on the schedule."
            className="py-8"
            action={<NewJobButton variant="pill" />}
          />
        </div>
      ) : (
        <div className="scroll-strip pb-1">
          {jobs.map(({ id, ...job }) => (
            <JobCard
              key={id}
              {...job}
              href={`?job=${id}#job-${id}`}
              className="max-w-[360px] min-w-[270px] basis-[calc((100%-36px)/3)]"
            />
          ))}
        </div>
      )}
    </div>
  )
}
