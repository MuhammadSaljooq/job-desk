import { describe, expect, it } from "vitest"
import { csvCell, csvFilename, transactionsCsv } from "@/features/books/csv"
import type { TxRow } from "@/features/books/queries"

const row = (over: Partial<TxRow>): TxRow => ({
  id: "t1",
  type: "INCOME",
  category: "DEPOSIT",
  amountCents: 10000,
  date: "2026-09-28",
  description: "Deposit for Q-1004",
  customerId: "c2",
  customerName: "David Chen",
  quoteId: "q4",
  quoteNumber: 1004,
  ...over,
})

describe("csvCell", () => {
  it("leaves plain text alone and quotes commas, quotes and new lines", () => {
    expect(csvCell("Fuel")).toBe("Fuel")
    expect(csvCell("Drywall, compound and screws")).toBe('"Drywall, compound and screws"')
    expect(csvCell('6" stud finder')).toBe('"6"" stud finder"')
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"')
  })

  it("neutralises text a spreadsheet would run as a formula", () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"')
    expect(csvCell("+1 extra")).toBe("'+1 extra")
    expect(csvCell("-5 refund")).toBe("'-5 refund")
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)")
  })
})

describe("transactionsCsv", () => {
  it("writes a header, signed plain amounts, labels and the quote number", () => {
    const csv = transactionsCsv([
      row({}),
      row({
        id: "t2",
        type: "EXPENSE",
        category: "MATERIALS",
        amountCents: 18640,
        date: "2026-09-26",
        description: "Drywall, compound and screws",
        customerName: "Oakwood Property Mgmt",
        quoteId: null,
        quoteNumber: null,
      }),
      row({
        id: "t3",
        category: "OTHER_INCOME",
        amountCents: 5,
        customerName: null,
        quoteNumber: null,
      }),
    ])
    expect(csv.startsWith("\uFEFF")).toBe(true)
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Date,Type,Category,Description,Customer,Quote,Amount",
      "2026-09-28,Revenue,Deposit,Deposit for Q-1004,David Chen,Q-1004,100.00",
      '2026-09-26,Expense,Materials,"Drywall, compound and screws",Oakwood Property Mgmt,,-186.40',
      "2026-09-28,Revenue,Other Income,Deposit for Q-1004,,,0.05",
      "",
    ])
  })

  it("quotes the Tools & Equipment style labels only when needed", () => {
    const csv = transactionsCsv([row({ type: "EXPENSE", category: "TOOLS_EQUIPMENT" })])
    expect(csv).toContain(",Expense,Tools & Equipment,")
  })

  it("names the file after the view", () => {
    expect(csvFilename("2026-09", "ALL")).toBe("jobdesk-transactions-2026-09.csv")
    expect(csvFilename(null, "EXPENSE")).toBe("jobdesk-expenses-all-time.csv")
    expect(csvFilename("2026-09", "INCOME")).toBe("jobdesk-revenue-2026-09.csv")
  })
})
