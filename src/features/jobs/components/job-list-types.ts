import type { JobStage } from "@/lib/status"

export type JobRow = {
  id: string
  title: string
  category: string | null
  stage: JobStage
  overdue: boolean
  /** "Fri, Oct 2 · 9:00 am" or null */
  when: string | null
  date: string
  time: string
  notes: string | null
  photoCount: number
  assignees: { id: string; name: string; color: string }[]
}
