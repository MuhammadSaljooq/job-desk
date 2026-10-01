import { describe, expect, it } from "vitest"
import {
  centsToInput,
  formatBps,
  formatMoney,
  formatSigned,
  marginPercent,
  percentToBps,
  sum,
  toCents,
} from "@/lib/money"

describe("toCents", () => {
  it("parses typed amounts without float error", () => {
    expect(toCents("85")).toBe(8500)
    expect(toCents("85.5")).toBe(8550)
    expect(toCents("85.05")).toBe(8505)
    expect(toCents("0.1")).toBe(10)
    expect(toCents("0.29")).toBe(29) // 0.29 * 100 = 28.999... as a float
    expect(toCents("1,234.56")).toBe(123456)
    expect(toCents(" $40.00 ")).toBe(4000)
    expect(toCents("-12.30")).toBe(-1230)
    expect(toCents("12.")).toBe(1200)
  })
  it("rejects invalid input", () => {
    expect(toCents("")).toBeNull()
    expect(toCents("   ")).toBeNull()
    expect(toCents("abc")).toBeNull()
    expect(toCents("1.234")).toBeNull()
    expect(toCents("1.2.3")).toBeNull()
    expect(toCents(null)).toBeNull()
    expect(toCents(undefined)).toBeNull()
    expect(toCents(Number.NaN)).toBeNull()
  })
  it("rounds numbers coming from code", () => {
    expect(toCents(338.04)).toBe(33804)
    expect(toCents(0.1 + 0.2)).toBe(30)
  })
})

describe("formatMoney", () => {
  it("always shows two decimals", () => {
    expect(formatMoney(33804)).toBe("$338.04")
    expect(formatMoney(0)).toBe("$0.00")
    expect(formatMoney(5)).toBe("$0.05")
    expect(formatMoney(144180)).toBe("$1,441.80")
    expect(formatMoney(-1999)).toBe("-$19.99")
  })
  it("formats signed ledger amounts", () => {
    expect(formatSigned(10000, "INCOME")).toBe("+$100.00")
    expect(formatSigned(6210, "EXPENSE")).toBe("−$62.10")
  })
  it("round-trips cents into an input value", () => {
    expect(centsToInput(8500)).toBe("85.00")
    expect(centsToInput(5)).toBe("0.05")
    expect(centsToInput(-1230)).toBe("-12.30")
    expect(centsToInput(null)).toBe("")
    expect(toCents(centsToInput(123456))).toBe(123456)
  })
})

describe("sum", () => {
  it("adds cents and skips empty values", () => {
    expect(sum([33804, 50000, 10000])).toBe(93804)
    expect(sum([100, null, undefined, 200])).toBe(300)
    expect(sum([])).toBe(0)
  })
})

describe("tax and margin", () => {
  it("converts percent to basis points", () => {
    expect(percentToBps("8")).toBe(800)
    expect(percentToBps("8.25")).toBe(825)
    expect(percentToBps("8%")).toBe(800)
    expect(percentToBps("0")).toBe(0)
    expect(percentToBps("101")).toBeNull()
    expect(percentToBps("8.255")).toBeNull()
    expect(percentToBps("x")).toBeNull()
  })
  it("formats basis points", () => {
    expect(formatBps(800)).toBe("8%")
    expect(formatBps(825)).toBe("8.25%")
    expect(formatBps(850)).toBe("8.5%")
  })
  it("computes margin like the books screenshot", () => {
    // revenue 938.04, net 276.54 -> 29%
    expect(marginPercent(27654, 93804)).toBe(29)
    expect(marginPercent(100, 0)).toBeNull()
  })
})
