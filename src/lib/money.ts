// Money helpers. Money is always integer cents; tax is basis points (800 = 8%).
// Parsing goes straight from the typed string to cents, never through a float.

const MONEY_RE = /^(-)?(\d{1,10})(?:\.(\d{0,2}))?$/

/**
 * Parse what a person typed ("1,234.5", "$85", " 40.00 ", "-12.30") into cents.
 * Returns null for anything that isn't a valid amount (empty, letters, 3+ decimals).
 */
export function toCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null
    // Numbers only come from code (never user input); round to the nearest cent.
    return Math.round(input * 100)
  }
  const cleaned = input.trim().replace(/[$,\s]/g, "")
  if (cleaned === "") return null
  const m = MONEY_RE.exec(cleaned)
  if (!m) return null
  const [, sign, whole, frac = ""] = m
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"))
  return sign ? -cents : cents
}

const formatters = new Map<string, Intl.NumberFormat>()
function formatter(currency: string) {
  let f = formatters.get(currency)
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    formatters.set(currency, f)
  }
  return f
}

/** 33804 -> "$338.04"; -1999 -> "-$19.99". Always two decimals. */
export function formatMoney(cents: number, currency = "USD"): string {
  return formatter(currency).format(cents / 100)
}

/** Ledger style: income "+$100.00", expense "−$62.10" (true minus sign). */
export function formatSigned(cents: number, type: "INCOME" | "EXPENSE", currency = "USD"): string {
  const abs = formatMoney(Math.abs(cents), currency)
  return type === "INCOME" ? `+${abs}` : `−${abs}`
}

/** Cents as an input value without the symbol: 8500 -> "85.00". */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ""
  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`
}

/** Sum of cents, ignoring null/undefined. */
export function sum(values: readonly (number | null | undefined)[]): number {
  let total = 0
  for (const v of values) if (typeof v === "number") total += v
  return total
}

/** "8", "8.25", "8%" -> 800, 825, 800. Null when invalid or outside 0-100%. */
export function percentToBps(input: string | number): number | null {
  const s = String(input).trim().replace(/%$/, "").trim()
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null
  const [whole, frac = ""] = s.split(".")
  const bps = Number(whole) * 100 + Number(frac.padEnd(2, "0"))
  return bps <= 10000 ? bps : null
}

/** 800 -> "8%", 825 -> "8.25%". */
export function formatBps(bps: number): string {
  const whole = Math.floor(bps / 100)
  const frac = bps % 100
  if (frac === 0) return `${whole}%`
  return `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}%`
}

/** Profit margin as a whole percent, or null when there is no revenue. */
export function marginPercent(netCents: number, revenueCents: number): number | null {
  if (revenueCents <= 0) return null
  return Math.round((netCents / revenueCents) * 100)
}
