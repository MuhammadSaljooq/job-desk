import { describe, expect, it } from "vitest"
import { lineAmount, paymentState, quoteTotals } from "@/features/quotes/totals"

describe("quote totals (cents)", () => {
  it("matches the builder screenshot (Q-1006)", () => {
    const t = quoteTotals(
      [
        { qty: 3, unitPriceCents: 8500 },
        { qty: 1, unitPriceCents: null }, // ceiling fan, price not typed yet
        { qty: 1, unitPriceCents: 3500 },
        { qty: 1, unitPriceCents: 4000 },
      ],
      { taxRateBps: 800 }
    )
    expect(t).toMatchObject({
      subtotal: 33000,
      discount: 0,
      tax: 2640,
      total: 35640,
      unpricedCount: 1,
    })
    expect(t.lineAmounts).toEqual([25500, 0, 3500, 4000])
  })

  it("matches the seeded quotes", () => {
    const q1002 = quoteTotals(
      [
        { qty: 2, unitPriceCents: 14500 },
        { qty: 1, unitPriceCents: 32000 },
        { qty: 4, unitPriceCents: 4500 },
        { qty: 1, unitPriceCents: 1800 },
        { qty: 2, unitPriceCents: 4200 },
        { qty: 3, unitPriceCents: 7500 },
      ],
      { taxRateBps: 800 }
    )
    expect(q1002.total).toBe(120636)
  })

  it("caps the discount at the subtotal and ignores negatives", () => {
    const lines = [{ qty: 1, unitPriceCents: 10000 }]
    expect(quoteTotals(lines, { taxRateBps: 800, discountCents: 25000 })).toMatchObject({
      discount: 10000,
      taxable: 0,
      tax: 0,
      total: 0,
    })
    expect(quoteTotals(lines, { taxRateBps: 800, discountCents: -500 }).discount).toBe(0)
  })

  it("taxes the subtotal minus the discount", () => {
    const t = quoteTotals([{ qty: 1, unitPriceCents: 10000 }], {
      taxRateBps: 800,
      discountCents: 2000,
    })
    expect(t).toMatchObject({ taxable: 8000, tax: 640, total: 8640 })
  })

  it("rounds half away from zero on lines and tax", () => {
    expect(lineAmount(1.5, 8505)).toBe(12758) // 12757.5 -> 12758
    expect(lineAmount("2.25", 3333)).toBe(7499) // 7499.25 -> 7499
    expect(lineAmount(0.1, 3)).toBe(0) // 0.3 -> 0
    // 1250 * 8.25% = 103.125 -> 103
    expect(quoteTotals([{ qty: 1, unitPriceCents: 1250 }], { taxRateBps: 825 }).tax).toBe(103)
    // 1000 * 0.05% = 0.5 -> 1
    expect(quoteTotals([{ qty: 1, unitPriceCents: 1000 }], { taxRateBps: 5 }).tax).toBe(1)
  })

  it("handles empty quotes and fractional quantities without float drift", () => {
    expect(quoteTotals([], { taxRateBps: 800 }).total).toBe(0)
    // 0.1 + 0.2 style drift: 3 lines of 0.1 h at $75/h = 3 × 750 cents
    const t = quoteTotals(
      [0.1, 0.1, 0.1].map((qty) => ({ qty, unitPriceCents: 7500 })),
      { taxRateBps: 0 }
    )
    expect(t.subtotal).toBe(2250)
  })
})

describe("payment state", () => {
  it("is derived from linked income for accepted quotes only", () => {
    expect(paymentState("SENT", 48060, 0)).toBe("NONE")
    expect(paymentState("ACCEPTED", 33804, 0)).toBe("UNPAID")
    expect(paymentState("ACCEPTED", 120636, 50000)).toBe("PART_PAID")
    expect(paymentState("ACCEPTED", 33804, 33804)).toBe("PAID")
    expect(paymentState("ACCEPTED", 33804, 40000)).toBe("PAID")
  })
})
