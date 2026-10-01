// Excel / CSV / pasted-rows import for the item catalog (phase 6, page-spec Page 7).
// Columns: Category, Item, Unit. Header row optional (detected by name), extra columns
// ignored, one-column files go to "Uncategorized", unit defaults to "each", duplicates
// (same name + category, case-insensitive) are skipped. No prices: the catalog never stores them.

import { CATALOG_UNITS, catalogNameKey, type CatalogUnit } from "./sample-catalog"

export const UNCATEGORIZED = "Uncategorized"
export const MAX_IMPORT_ROWS = 2000

export type ImportRow = {
  /** 1-based row number in the file, for the preview */
  line: number
  category: string
  name: string
  unit: CatalogUnit | string
  status: "new" | "duplicate" | "invalid"
  reason?: string
}

const UNIT_SYNONYMS: Record<string, CatalogUnit> = {
  each: "each",
  ea: "each",
  "ea.": "each",
  pc: "each",
  pcs: "each",
  piece: "each",
  pieces: "each",
  unit: "each",
  units: "each",
  item: "each",
  hour: "hour",
  hours: "hour",
  hr: "hour",
  hrs: "hour",
  h: "hour",
  "sq ft": "sq ft",
  sqft: "sq ft",
  "sq. ft.": "sq ft",
  "sq.ft": "sq ft",
  "square foot": "sq ft",
  "square feet": "sq ft",
  sf: "sq ft",
  ft2: "sq ft",
  "linear ft": "linear ft",
  "linear foot": "linear ft",
  "linear feet": "linear ft",
  "lin ft": "linear ft",
  lf: "linear ft",
  "ln ft": "linear ft",
  room: "room",
  rooms: "room",
  sheet: "sheet",
  sheets: "sheet",
  box: "box",
  boxes: "box",
  gallon: "gallon",
  gallons: "gallon",
  gal: "gallon",
  tube: "tube",
  tubes: "tube",
  set: "set",
  sets: "set",
  load: "load",
  loads: "load",
}

/** "Hrs", "sq. ft.", "EA" -> canonical unit; "" -> "each"; unknown -> null. */
export function normalizeUnit(raw: string): CatalogUnit | null {
  const v = raw.trim().toLowerCase().replace(/\s+/g, " ")
  if (!v) return "each"
  if ((CATALOG_UNITS as readonly string[]).includes(v)) return v as CatalogUnit
  return UNIT_SYNONYMS[v] ?? UNIT_SYNONYMS[v.replace(/\.$/, "")] ?? null
}

const HEADER_ALIASES = {
  category: ["category", "categories", "group", "type", "section", "trade"],
  name: [
    "item",
    "items",
    "name",
    "item name",
    "service",
    "services",
    "description",
    "product",
    "material",
  ],
  unit: ["unit", "units", "uom", "unit of measure", "per"],
} as const

function headerKind(cell: string): keyof typeof HEADER_ALIASES | null {
  const v = cell.trim().toLowerCase()
  for (const k of Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]) {
    if ((HEADER_ALIASES[k] as readonly string[]).includes(v)) return k
  }
  return null
}

type Columns = { category: number | null; name: number; unit: number | null }

/** Find the column layout: by header names when the first row is a header, else by position. */
export function detectColumns(rows: string[][]): { columns: Columns; hasHeader: boolean } {
  const first = rows[0] ?? []
  const kinds = first.map(headerKind)
  if (kinds.includes("name")) {
    return {
      hasHeader: true,
      columns: {
        name: kinds.indexOf("name"),
        category: kinds.includes("category") ? kinds.indexOf("category") : null,
        unit: kinds.includes("unit") ? kinds.indexOf("unit") : null,
      },
    }
  }
  // No header. Width = the widest non-empty row (ignoring trailing blanks).
  const width = Math.max(0, ...rows.map((r) => trimRight(r).length))
  if (width <= 1) return { hasHeader: false, columns: { category: null, name: 0, unit: null } }
  if (width === 2) {
    // Two columns: "Item, Unit" when the second column looks like units, else "Category, Item".
    const second = rows.map((r) => r[1] ?? "").filter((v) => v.trim())
    const unitish =
      second.length > 0 && second.filter((v) => normalizeUnit(v)).length / second.length >= 0.8
    return unitish
      ? { hasHeader: false, columns: { category: null, name: 0, unit: 1 } }
      : { hasHeader: false, columns: { category: 0, name: 1, unit: null } }
  }
  return { hasHeader: false, columns: { category: 0, name: 1, unit: 2 } }
}

function trimRight(r: string[]) {
  const out = [...r]
  while (out.length && !String(out[out.length - 1] ?? "").trim()) out.pop()
  return out
}

const clean = (v: unknown) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()

/**
 * Turn raw rows into a preview: each row is new, a duplicate (already in the catalog or
 * earlier in the file) or invalid (no item name, unknown unit, too long).
 */
export function buildPreview(
  rawRows: unknown[][],
  existing: { category: string; name: string }[]
): { rows: ImportRow[]; hasHeader: boolean; truncated: boolean } {
  const rows = rawRows.map((r) => (Array.isArray(r) ? r.map(clean) : []))
  const { columns, hasHeader } = detectColumns(rows.filter((r) => r.some(Boolean)))
  const seen = new Set(
    existing.map((e) => `${catalogNameKey(e.category)}::${catalogNameKey(e.name)}`)
  )
  const out: ImportRow[] = []
  let headerSkipped = !hasHeader
  let truncated = false

  rows.forEach((r, i) => {
    if (!r.some(Boolean)) return // blank row
    if (!headerSkipped) {
      headerSkipped = true
      return
    }
    if (out.length >= MAX_IMPORT_ROWS) {
      truncated = true
      return
    }
    const name = r[columns.name] ?? ""
    const category = (columns.category !== null ? r[columns.category] : "") || UNCATEGORIZED
    const rawUnit = columns.unit !== null ? (r[columns.unit] ?? "") : ""
    const unit = normalizeUnit(rawUnit)
    const base = { line: i + 1, category, name, unit: unit ?? rawUnit }
    if (!name) return out.push({ ...base, status: "invalid", reason: "No item name" })
    if (name.length > 120)
      return out.push({ ...base, status: "invalid", reason: "Item name is over 120 characters" })
    if (category.length > 60)
      return out.push({ ...base, status: "invalid", reason: "Category is over 60 characters" })
    if (!unit) {
      return out.push({
        ...base,
        status: "invalid",
        reason: `Unknown unit “${rawUnit}”. Use ${CATALOG_UNITS.join(", ")}`,
      })
    }
    const key = `${catalogNameKey(category)}::${catalogNameKey(name)}`
    if (seen.has(key))
      return out.push({ ...base, status: "duplicate", reason: "Already in your list" })
    seen.add(key)
    out.push({ ...base, status: "new" })
  })
  return { rows: out, hasHeader, truncated }
}

/** Rows pasted from Excel (tab-separated) or typed as CSV. */
export function parsePasted(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  const tabbed = lines.some((l) => l.includes("\t"))
  return lines.map((l) => (tabbed ? l.split("\t") : parseCsvLine(l)))
}

/** One CSV line with "quoted, values" and "" escapes. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ",") {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out
}

/** First sheet of an .xlsx / .xls / .csv file as rows of text (SheetJS, loaded on demand). */
export async function parseWorkbook(data: ArrayBuffer): Promise<string[][]> {
  const XLSX = await import("xlsx")
  const wb = XLSX.read(data, { type: "array", cellDates: false, dense: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: true,
  })
}
