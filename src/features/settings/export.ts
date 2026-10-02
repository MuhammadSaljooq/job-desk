// Settings > Data > Export: customers and jobs as CSV (transactions reuse books/csv.ts).
// Pure functions, so the quoting and formula escaping are unit tested once in csvCell.

import { csvCell } from "@/features/books/csv"

export type CustomerCsvRow = {
  name: string
  type: string
  status: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  createdDay: string
}

export type JobCsvRow = {
  title: string
  customer: string
  category: string | null
  stage: string
  scheduled: string | null // "2026-10-02 09:00" in the business timezone
  assignees: string[]
  notes: string | null
}

const STAGE_LABEL: Record<string, string> = {
  LEAD: "Lead",
  QUOTED: "Quoted",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
}

const title = (v: string) => v.charAt(0) + v.slice(1).toLowerCase()

function csv(header: string[], rows: string[][]) {
  return "\uFEFF" + [header.join(","), ...rows.map((r) => r.join(","))].join("\r\n") + "\r\n"
}

export function customersCsv(rows: readonly CustomerCsvRow[]) {
  return csv(
    ["Name", "Type", "Status", "Phone", "Email", "Address", "Notes", "Customer since"],
    rows.map((r) => [
      csvCell(r.name),
      title(r.type),
      title(r.status),
      csvCell(r.phone ?? ""),
      csvCell(r.email ?? ""),
      csvCell(r.address ?? ""),
      csvCell(r.notes ?? ""),
      r.createdDay,
    ])
  )
}

export function jobsCsv(rows: readonly JobCsvRow[]) {
  return csv(
    ["Job", "Customer", "Category", "Stage", "Scheduled", "Assigned to", "Notes"],
    rows.map((r) => [
      csvCell(r.title),
      csvCell(r.customer),
      csvCell(r.category ?? ""),
      STAGE_LABEL[r.stage] ?? r.stage,
      r.scheduled ?? "",
      csvCell(r.assignees.join("; ")),
      csvCell(r.notes ?? ""),
    ])
  )
}
