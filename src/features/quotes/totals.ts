// Quote totals in integer cents. The single source of truth for quote math; the SQL in
// ./sql.ts mirrors it exactly so lists and dashboards can sum in the database.
//
//   line amount = round(qty × unit price)        (qty may be fractional, e.g. 2.5 hours)
//   subtotal    = Σ line amounts                 (unpriced lines count as 0)
//   discount    = min(discount, subtotal)        (never below zero)
//   tax         = round((subtotal − discount) × taxRateBps / 10000)
//   total       = subtotal − discount + tax
// round() is half away from zero, the same as Postgres ROUND(numeric).

export type TotalsLine = { qty: number | string; unitPriceCents: number | null }

export type QuoteTotals = {
  lineAmounts: number[]
  subtotal: number
  discount: number
  taxable: number
  tax: number
  total: number
  unpricedCount: number
}

function roundHalfAwayFromZero(n: number): number {
  return Math.sign(n) * Math.round(Math.abs(n))
}

/** qty × cents without float drift: qty has at most 2 decimals, so scale it to hundredths. */
export function lineAmount(qty: number | string, unitPriceCents: number | null): number {
  if (unitPriceCents === null) return 0
  const q = typeof qty === "string" ? Number(qty) : qty
  if (!Number.isFinite(q)) return 0
  const qtyHundredths = Math.round(q * 100)
  return roundHalfAwayFromZero((qtyHundredths * unitPriceCents) / 100)
}

export function quoteTotals(
  lines: readonly TotalsLine[],
  opts: { taxRateBps: number; discountCents?: number }
): QuoteTotals {
  const lineAmounts = lines.map((l) => lineAmount(l.qty, l.unitPriceCents))
  const subtotal = lineAmounts.reduce((a, b) => a + b, 0)
  const discount = Math.min(Math.max(0, opts.discountCents ?? 0), Math.max(0, subtotal))
  const taxable = subtotal - discount
  const tax = roundHalfAwayFromZero((taxable * opts.taxRateBps) / 10000)
  return {
    lineAmounts,
    subtotal,
    discount,
    taxable,
    tax,
    total: taxable + tax,
    unpricedCount: lines.filter((l) => l.unitPriceCents === null).length,
  }
}

export type PaymentState = "NONE" | "UNPAID" | "PART_PAID" | "PAID"

/** Paid status of an ACCEPTED quote from the income linked to it. */
export function paymentState(status: string, totalCents: number, paidCents: number): PaymentState {
  if (status !== "ACCEPTED") return "NONE"
  if (paidCents <= 0) return "UNPAID"
  return paidCents >= totalCents ? "PAID" : "PART_PAID"
}
