import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { dayInZone } from "@/lib/dates"
import { parseMonthParam } from "@/lib/month"
import { listTransactions, parseTypeParam } from "@/features/books/queries"
import { csvFilename, transactionsCsv } from "@/features/books/csv"

/** GET /api/books/export?month=&type=: the /books view as CSV (same params as the page). */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return new NextResponse("Please sign in", { status: 401 })
  const sp = new URL(request.url).searchParams
  const thisMonth = dayInZone(new Date(), user.timezone).slice(0, 7)
  const month = parseMonthParam(sp.get("month") ?? undefined, thisMonth)
  const type = parseTypeParam(sp.get("type"))
  const rows = await listTransactions(user.businessId, { month, type })
  return new NextResponse(transactionsCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(month, type)}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
