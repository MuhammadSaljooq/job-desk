/**
 * Where to go after signing in. Only same-site paths are allowed ("/customers?x=1"), never
 * another origin ("//evil.com", "https://...", "/\\evil.com"), to prevent open redirects.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/"
  const v = value.trim()
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/"
  if (/[\r\n]/.test(v)) return "/"
  if (v.startsWith("/login") || v.startsWith("/api/")) return "/"
  return v
}
