import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { dbDateToDay } from "@/lib/dates"
import { lineAmount, quoteTotals } from "@/features/quotes/totals"
import { QuoteDocument, type QuotePdfData } from "@/features/quotes/pdf/quote-document"

export const runtime = "nodejs"

/**
 * GET /api/quotes/{id}/pdf: the printable quote. Blocked while any line is unpriced (D6).
 * `?download=1` saves it as a file instead of opening it (D5).
 */
export async function GET(request: Request, ctx: RouteContext<"/api/quotes/[id]/pdf">) {
  const user = await getCurrentUser()
  if (!user) return new NextResponse("Please sign in", { status: 401 })
  const { id } = await ctx.params
  const q = await db.quote.findFirst({
    where: { id, businessId: user.businessId },
    include: { lines: { orderBy: { sortOrder: "asc" } }, customer: true },
  })
  if (!q) return new NextResponse("Quote not found", { status: 404 })
  const unpriced = q.lines.filter((l) => l.unitPriceCents === null).length
  if (unpriced || q.lines.length === 0) {
    return new NextResponse(
      unpriced
        ? `Enter a price for ${unpriced} item${unpriced === 1 ? "" : "s"} before printing.`
        : "Add at least one line first.",
      { status: 409, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    )
  }
  const business = await db.business.findUniqueOrThrow({ where: { id: user.businessId } })
  const t = quoteTotals(
    q.lines.map((l) => ({ qty: l.qty.toString(), unitPriceCents: l.unitPriceCents })),
    { taxRateBps: q.taxRateBps, discountCents: q.discountCents }
  )
  const data: QuotePdfData = {
    business: {
      name: business.name,
      phone: business.phone,
      email: business.email,
      address: business.address,
      logo:
        business.logoThumb && business.logoMime
          ? { data: Buffer.from(business.logoThumb), mime: business.logoMime }
          : null,
    },
    number: q.number,
    date: dbDateToDay(q.date),
    status: q.status,
    title: q.title,
    customer: {
      name: q.customer.name,
      address: q.customer.address,
      phone: q.customer.phone,
      email: q.customer.email,
    },
    lines: q.lines.map((l) => ({
      name: l.name,
      category: l.category,
      unit: l.unit,
      qty: String(Number(l.qty)),
      unitPriceCents: l.unitPriceCents!,
      amountCents: lineAmount(l.qty.toString(), l.unitPriceCents),
    })),
    subtotal: t.subtotal,
    discount: t.discount,
    taxRateBps: q.taxRateBps,
    tax: t.tax,
    total: t.total,
    notes: q.notes,
    footer: q.footer ?? business.quoteFooter,
    currency: business.currency,
  }
  const download = new URL(request.url).searchParams.get("download") === "1"
  const pdf = await renderToBuffer(<QuoteDocument d={data} />)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Q-${q.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
