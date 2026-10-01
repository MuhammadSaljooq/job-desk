// Avatar initials and colours (CLAUDE.md > Avatar palette).

export const AVATAR_PALETTE = [
  "#C9825B",
  "#4F7FBF",
  "#5B8F6A",
  "#B05D8E",
  "#7A6BC2",
  "#3F8F93",
  "#D09A36",
  "#2D3436",
] as const

/** "Sarah Mitchell" -> "SM", "Oakwood Property Mgmt" -> "OP", "alvarez" -> "AL". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Stable colour for a name, so a customer keeps their colour everywhere. */
export function colorForName(name: string): string {
  let hash = 0
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_PALETTE[hash % (AVATAR_PALETTE.length - 1)] // the last (ink) colour is kept for the owner
}
