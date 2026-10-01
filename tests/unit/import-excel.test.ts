import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"
import {
  UNCATEGORIZED,
  buildPreview,
  detectColumns,
  normalizeUnit,
  parseCsvLine,
  parsePasted,
  parseWorkbook,
} from "@/features/catalog/import-excel"

const summary = (rows: ReturnType<typeof buildPreview>["rows"]) =>
  rows.map((r) => [r.status, r.category, r.name, r.unit])

describe("catalog import parser", () => {
  it("reads a header row by name, in any column order", () => {
    const { rows, hasHeader } = buildPreview(
      [
        ["Unit", "Item", "Category"],
        ["each", "TV Wall Mount (Full Motion)", "TV & Mounting"],
        ["sheet", "Drywall Sheets", "Construction Supplies"],
      ],
      []
    )
    expect(hasHeader).toBe(true)
    expect(summary(rows)).toEqual([
      ["new", "TV & Mounting", "TV Wall Mount (Full Motion)", "each"],
      ["new", "Construction Supplies", "Drywall Sheets", "sheet"],
    ])
    expect(rows[0].line).toBe(2)
  })

  it("works without a header (Category, Item, Unit by position)", () => {
    const { rows, hasHeader } = buildPreview([["Labor & Fees", "Hourly Labor", "hour"]], [])
    expect(hasHeader).toBe(false)
    expect(summary(rows)).toEqual([["new", "Labor & Fees", "Hourly Labor", "hour"]])
  })

  it("puts one-column files in Uncategorized with unit each", () => {
    const { rows } = buildPreview([["Light Fixture Install"], ["Ceiling Fan Install"]], [])
    expect(summary(rows)).toEqual([
      ["new", UNCATEGORIZED, "Light Fixture Install", "each"],
      ["new", UNCATEGORIZED, "Ceiling Fan Install", "each"],
    ])
  })

  it("reads two columns as Item + Unit when the second looks like units, else Category + Item", () => {
    expect(
      summary(
        buildPreview(
          [
            ["Hourly Labor", "hrs"],
            ["Drywall Sheets", "sheet"],
          ],
          []
        ).rows
      )
    ).toEqual([
      ["new", UNCATEGORIZED, "Hourly Labor", "hour"],
      ["new", UNCATEGORIZED, "Drywall Sheets", "sheet"],
    ])
    expect(summary(buildPreview([["Plumbing", "Leak Repair"]], []).rows)).toEqual([
      ["new", "Plumbing", "Leak Repair", "each"],
    ])
  })

  it("skips blank rows and ignores extra columns", () => {
    const { rows } = buildPreview(
      [
        ["Category", "Item", "Unit", "Price", "Notes"],
        ["", "", "", "", ""],
        ["Painting", "Ceiling Painting", "room", "$250", "two coats"],
        [],
        ["Painting", "Paint Touch-ups", "hour", "", ""],
      ],
      []
    )
    expect(summary(rows)).toEqual([
      ["new", "Painting", "Ceiling Painting", "room"],
      ["new", "Painting", "Paint Touch-ups", "hour"],
    ])
  })

  it("flags duplicates against the catalog and within the file (case-insensitive)", () => {
    const { rows } = buildPreview(
      [
        ["Electrical", "light fixture install", "each"],
        ["Electrical", "Dimmer Switch Install", "each"],
        ["ELECTRICAL", "Dimmer  Switch Install ", "each"],
        ["Plumbing", "Dimmer Switch Install", "each"], // different category: allowed
      ],
      [{ category: "Electrical", name: "Light Fixture Install" }]
    )
    expect(rows.map((r) => r.status)).toEqual(["duplicate", "new", "duplicate", "new"])
  })

  it("marks rows invalid with a reason", () => {
    const { rows } = buildPreview(
      [
        ["Category", "Item", "Unit"],
        ["Electrical", "", "each"],
        ["Electrical", "Outlet", "bucket"],
        ["Electrical", "x".repeat(121), "each"],
      ],
      []
    )
    expect(rows.map((r) => r.status)).toEqual(["invalid", "invalid", "invalid"])
    expect(rows[1].reason).toMatch(/Unknown unit “bucket”/)
  })

  it("normalizes unit spellings", () => {
    expect(normalizeUnit("EA")).toBe("each")
    expect(normalizeUnit("Hrs")).toBe("hour")
    expect(normalizeUnit("sq. ft.")).toBe("sq ft")
    expect(normalizeUnit("SF")).toBe("sq ft")
    expect(normalizeUnit("LF")).toBe("linear ft")
    expect(normalizeUnit("gal")).toBe("gallon")
    expect(normalizeUnit("")).toBe("each")
    expect(normalizeUnit("pallet")).toBeNull()
  })

  it("parses pasted Excel rows (tabs) and CSV with quotes", () => {
    expect(parsePasted("Category\tItem\tUnit\r\nTV & Mounting\tSoundbar Mount\teach\n")).toEqual([
      ["Category", "Item", "Unit"],
      ["TV & Mounting", "Soundbar Mount", "each"],
      [""],
    ])
    expect(parseCsvLine('Assembly,"Desk, Office Assembly",each')).toEqual([
      "Assembly",
      "Desk, Office Assembly",
      "each",
    ])
    expect(parseCsvLine('"Say ""hi""",x')).toEqual(['Say "hi"', "x"])
  })

  it("reads the first sheet of a real .xlsx file", async () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Category", "Item", "Unit"],
        ["Flooring & Tile", "Tile Repair", "sq ft"],
        ["Flooring & Tile", "Grout & Caulk Refresh", "room"],
      ]),
      "Items"
    )
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    const rows = await parseWorkbook(buf)
    expect(summary(buildPreview(rows, []).rows)).toEqual([
      ["new", "Flooring & Tile", "Tile Repair", "sq ft"],
      ["new", "Flooring & Tile", "Grout & Caulk Refresh", "room"],
    ])
  })

  it("detects the header only when it names an item column", () => {
    expect(detectColumns([["Name"], ["x"]]).hasHeader).toBe(true)
    expect(detectColumns([["TV & Mounting", "Soundbar", "each"]]).hasHeader).toBe(false)
  })
})
