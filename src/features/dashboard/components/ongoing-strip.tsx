"use client"

import Link from "next/link"
import { BookOpen, ChevronDown, UserPlus, Wrench } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { JobCard } from "@/components/shared/job-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StagePill } from "@/components/shared/status-pill"
import type { DashboardJob } from "../queries"

/** Row 1 right: "Ongoing jobs ▾" (jump to a job) above a sideways strip of pastel JobCards. */
export function OngoingStrip({ jobs, hasAnyJobs }: { jobs: DashboardJob[]; hasAnyJobs: boolean }) {
  return (
    <div className="min-w-0">
      <div className="mb-[14px] flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!jobs.length}
            className="inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-ink-foreground outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-default"
          >
            Ongoing jobs <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuLabel>Jump to a job</DropdownMenuLabel>
            {jobs.map((j) => (
              <DropdownMenuItem key={j.id} asChild>
                <Link href={j.href} className="justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate">{j.title}</span>
                    <span className="block truncate text-[12px] text-text-muted">
                      {j.customerName}
                      {j.whenLabel ? ` · ${j.whenLabel}` : ""}
                    </span>
                  </span>
                  <StagePill stage={j.stage} overdue={j.overdue} />
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {jobs.length === 0 ? (
        <div className="rounded-card bg-surface">
          {hasAnyJobs ? (
            <EmptyState
              icon={<Wrench />}
              title="Nothing ongoing for this filter"
              description="Every job here is done, or none match the filter."
              className="py-8"
            />
          ) : (
            <EmptyState
              icon={<Wrench />}
              title="No jobs yet"
              description="Add your first customer, or bring in your item list to start quoting."
              className="py-8"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link href="/customers?new=customer">
                      <UserPlus /> Add a customer
                    </Link>
                  </Button>
                  <Button variant="secondary" className="bg-surface-muted" asChild>
                    <Link href="/catalog">
                      <BookOpen /> Import items
                    </Link>
                  </Button>
                </div>
              }
            />
          )}
        </div>
      ) : (
        <div className="scroll-strip pb-1">
          {jobs.map((j) => (
            <JobCard
              key={j.id}
              href={j.href}
              dateLabel={j.dateLabel}
              title={j.title}
              category={j.category ?? j.customerName}
              stage={j.stage}
              overdue={j.overdue}
              assignees={j.assignees}
              chip={j.chip}
              className="max-w-[360px]"
            />
          ))}
        </div>
      )}
    </div>
  )
}
