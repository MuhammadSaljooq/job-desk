// "Export CSV" on /books: the current view as a spreadsheet-friendly file. Pure, unit tested.

import { centsToInput } from "@/lib/money"
import { CATEGORY_LABEL } from "./categories"
import type { TxRow } from "./queries"

/**
 * Quote a cell when needed, and neutralise text that Excel / Sheets would run as a formula
 * (a description like "=HYPERLINK(...)" or "-5 refund"), by prefixing it with an apostrophe.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export const CSV_HEADER = ["Date", "Type", "Category", "Description", "Customer", "Quote", "Amount"]

/** One row per transaction; Amount is a signed plain number (expenses negative) so it sums. */
export function transactionsCsv(rows: readonly TxRow[]): string {
  const lines = [CSV_HEADER.join(",")]
  for (const r of rows) {
    const amount = centsToInput(r.type === "EXPENSE" ? -r.amountCents : r.amountCents)
    lines.push(
      [
        r.date,
        r.type === "INCOME" ? "Revenue" : "Expense",
        csvCell(CATEGORY_LABEL[r.category]),
        csvCell(r.description),
        csvCell(r.customerName ?? ""),
        r.quoteNumber ? `Q-${r.quoteNumber}` : "",
        amount,
      ].join(",")
    )
  }
  // BOM so Excel reads UTF-8 (names with accents), CRLF line ends per RFC 4180
  return "\uFEFF" + lines.join("\r\n") + "\r\n"
}

export function csvFilename(month: string | null, type: "ALL" | "INCOME" | "EXPENSE"): string {
  const kind = type === "INCOME" ? "revenue" : type === "EXPENSE" ? "expenses" : "transactions"
  return `jobdesk-${kind}-${month ?? "all-time"}.csv`
}
