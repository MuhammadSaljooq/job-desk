"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/shared/status-pill"
import { buildPreview, parsePasted, parseWorkbook, type ImportRow } from "../import-excel"
import { importCatalogAction } from "../actions"

const STATUS: Record<ImportRow["status"], { label: string; tone: "mint" | "neutral" | "blush" }> = {
  new: { label: "New", tone: "mint" },
  duplicate: { label: "Duplicate", tone: "neutral" },
  invalid: { label: "Invalid", tone: "blush" },
}

/** Import your item list: upload .xlsx / .csv or paste rows, preview, then import. */
export function ImportCard({
  existing,
  onClose,
}: {
  existing: { category: string; name: string }[]
  onClose: () => void
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<unknown[][] | null>(null)
  const [source, setSource] = useState<string>("")
  const [paste, setPaste] = useState("")
  const [reading, setReading] = useState(false)
  const [pending, start] = useTransition()

  const preview = useMemo(() => (rows ? buildPreview(rows, existing) : null), [rows, existing])
  const counts = useMemo(() => {
    const c = { new: 0, duplicate: 0, invalid: 0 }
    for (const r of preview?.rows ?? []) c[r.status]++
    return c
  }, [preview])

  async function onFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That file is over 5 MB. Export just the item list.")
      return
    }
    setReading(true)
    try {
      const data = await file.arrayBuffer()
      const parsed = file.name.toLowerCase().endsWith(".csv")
        ? parsePasted(new TextDecoder().decode(data))
        : await parseWorkbook(data)
      setRows(parsed)
      setSource(file.name)
      setPaste("")
    } catch {
      toast.error("Couldn't read that file. Save it as .xlsx or .csv and try again.")
    } finally {
      setReading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  function onPaste(text: string) {
    setPaste(text)
    setSource(text.trim() ? "Pasted rows" : "")
    setRows(text.trim() ? parsePasted(text) : null)
  }

  function runImport() {
    const toImport = (preview?.rows ?? []).filter((r) => r.status === "new")
    start(async () => {
      const res = await importCatalogAction({
        rows: toImport.map((r) => ({ category: r.category, name: r.name, unit: r.unit })),
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const { imported, skipped } = res.data
      const dupes = skipped + counts.duplicate
      toast.success(
        `Imported ${imported} item${imported === 1 ? "" : "s"}` +
          (dupes ? `, skipped ${dupes} duplicate${dupes === 1 ? "" : "s"}` : "") +
          (counts.invalid ? `, ${counts.invalid} invalid` : "")
      )
      setRows(null)
      setPaste("")
      setSource("")
      router.refresh()
    })
  }

  return (
    <section
      className="mb-[18px] rounded-card border-2 border-ink bg-surface p-5"
      aria-labelledby="import-title"
    >
      <header className="mb-1 flex items-start justify-between gap-3">
        <h2 id="import-title" className="flex items-center gap-2 text-[16px] font-semibold">
          <Upload className="size-4" /> Import your item list
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close import"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-text-muted hover:bg-surface-muted"
        >
          <X className="size-4" />
        </button>
      </header>
      <p className="mb-4 text-[13px] text-text-muted">
        Columns: Category, Item, Unit. Header row optional, duplicates skipped. No prices: you type
        those on each quote.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-[16px] bg-surface-muted text-[13px]">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[12px] text-text-muted">
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium">Unit</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-t [&_td]:border-divider [&_td]:px-4 [&_td]:py-2.5">
                <tr>
                  <td>TV &amp; Mounting</td>
                  <td>TV Wall Mount (Full Motion)</td>
                  <td>each</td>
                </tr>
                <tr>
                  <td>Construction Supplies</td>
                  <td>Drywall Sheets</td>
                  <td>sheet</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Button className="mt-4" onClick={() => fileInput.current?.click()} disabled={reading}>
            {reading ? <Loader2 className="animate-spin" /> : <Upload />} Upload .xlsx or .csv
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            aria-label="Upload a spreadsheet"
            onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])}
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <label htmlFor="import-paste" className="mb-1.5 text-[12px] font-medium text-text-muted">
            Or paste rows copied from Excel
          </label>
          <textarea
            id="import-paste"
            value={paste}
            onChange={(e) => onPaste(e.target.value)}
            placeholder={"Category\tItem\tUnit"}
            rows={6}
            className="min-h-36 w-full flex-1 rounded-[16px] bg-surface-muted p-4 font-mono text-[13px] outline-none placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ink"
          />
        </div>
      </div>

      {preview && (
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[13px]">
              <FileSpreadsheet className="size-4 text-text-muted" />
              <b className="font-semibold">{source}</b>
              <span className="text-text-muted">
                {counts.new} new · {counts.duplicate} duplicate · {counts.invalid} invalid
                {preview.hasHeader ? " · header row detected" : ""}
                {preview.truncated ? " · only the first 2000 rows" : ""}
              </span>
            </p>
            <Button onClick={runImport} disabled={pending || counts.new === 0}>
              {pending && <Loader2 className="animate-spin" />}
              Import {counts.new} item{counts.new === 1 ? "" : "s"}
            </Button>
          </div>
          {preview.rows.length === 0 ? (
            <p className="rounded-[16px] bg-surface-muted p-4 text-[13px] text-text-muted">
              No rows found. Check the file has Category, Item and Unit columns.
            </p>
          ) : (
            <div className="relative max-h-80 overflow-auto rounded-[16px] border border-divider">
              <table className="w-full text-[13px]" aria-label="Import preview">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-[12px] text-text-muted">
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Unit</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr
                      key={r.line}
                      className={cn(
                        "border-t border-divider",
                        r.status !== "new" && "text-text-muted"
                      )}
                    >
                      <td className="tabular px-3 py-2">{r.line}</td>
                      <td className="px-3 py-2">{r.category}</td>
                      <td className="px-3 py-2 font-medium">
                        {r.name || <span className="text-text-subtle">(empty)</span>}
                      </td>
                      <td className="px-3 py-2">{r.unit}</td>
                      <td className="px-3 py-2">
                        <StatusPill tone={STATUS[r.status].tone}>
                          {STATUS[r.status].label}
                        </StatusPill>
                        {r.reason && r.status === "invalid" && (
                          <span className="ml-2 text-[12px] text-blush-ink">{r.reason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
