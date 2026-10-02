/** Compact axis labels from cents: 60000 -> "$600", 150000 -> "$1.5k". */
export function axisMoney(cents: number): string {
  const dollars = cents / 100
  return dollars >= 1000 ? `$${Number((dollars / 1000).toFixed(1))}k` : `$${Math.round(dollars)}`
}
