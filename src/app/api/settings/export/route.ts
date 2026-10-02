import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { dayInZone, timeInZone } from "@/lib/dates"
import { listTransactions } from "@/features/books/queries"
import { transactionsCsv } from "@/features/books/csv"
import { customersCsv, jobsCsv } from "@/features/settings/export"

/** GET /api/settings/export?kind=customers|jobs|transactions: owner only, all time. */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return new NextResponse("Please sign in", { status: 401 })
  if (user.role !== "OWNER") return new NextResponse("Only the owner can export", { status: 403 })
  const kind = new URL(request.url).searchParams.get("kind")
  const tz = user.timezone
  let body: string
  if (kind === "customers") {
    const rows = await db.customer.findMany({
      where: { businessId: user.businessId },
      orderBy: { name: "asc" },
    })
    body = customersCsv(rows.map((c) => ({ ...c, createdDay: dayInZone(c.createdAt, tz) })))
  } else if (kind === "jobs") {
    const rows = await db.job.findMany({
      where: { businessId: user.businessId },
      include: { customer: { select: { name: true } }, assignees: { select: { name: true } } },
      orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    })
    body = jobsCsv(
      rows.map((j) => ({
        title: j.title,
        customer: j.customer.name,
        category: j.category,
        stage: j.stage,
        scheduled: j.scheduledAt
          ? `${dayInZone(j.scheduledAt, tz)} ${timeInZone(j.scheduledAt, tz)}`
          : null,
        assignees: j.assignees.map((a) => a.name),
        notes: j.notes,
      }))
    )
  } else if (kind === "transactions") {
    body = transactionsCsv(await listTransactions(user.businessId, { month: null }))
  } else {
    return new NextResponse("Unknown export", { status: 404 })
  }
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobdesk-${kind}.csv"`,
      "Cache-Control": "private, no-store",
    },
  })
}
