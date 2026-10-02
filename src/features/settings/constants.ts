// Plain constants for the settings cards (no zod in the client bundle).

export const CURRENCIES = [
  { code: "USD", label: "$ US Dollar" },
  { code: "CAD", label: "$ Canadian Dollar" },
  { code: "AUD", label: "$ Australian Dollar" },
  { code: "GBP", label: "£ British Pound" },
  { code: "EUR", label: "€ Euro" },
] as const

// The common North American zones first; any IANA zone the runtime knows is accepted.
export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Australia/Sydney",
] as const

export const AVATAR_COLORS = [
  "#C9825B",
  "#4F7FBF",
  "#5B8F6A",
  "#B05D8E",
  "#7A6BC2",
  "#3F8F93",
  "#D09A36",
  "#2D3436",
] as const
