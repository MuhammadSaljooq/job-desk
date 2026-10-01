// Folder layout Dylan can browse himself in Drive / Dropbox (phase 5 prompt):
//   JobDesk/Customers/{Customer name}/{Job title or General}/{Before|During|After}/
//     2026-09-29_1432_{shortId}.jpg

export const ROOT_FOLDER = "JobDesk"

export type PhotoStage = "BEFORE" | "DURING" | "AFTER"

const STAGE_FOLDER: Record<PhotoStage, string> = {
  BEFORE: "Before",
  DURING: "During",
  AFTER: "After",
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
}

/**
 * Safe folder / file name on Drive, Dropbox, Windows and macOS: no slashes or reserved
 * characters, no control characters, no trailing dots or spaces, not empty, not "." or "..",
 * at most 80 characters.
 */
export function sanitizeName(name: string, fallback = "Untitled"): string {
  const cleaned = name
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .replace(/^\.+/, "")
    .slice(0, 80)
    .trim()
  return cleaned && cleaned !== "." && cleaned !== ".." ? cleaned : fallback
}

export function customerFolder(customerName: string): string {
  return `${ROOT_FOLDER}/Customers/${sanitizeName(customerName, "Customer")}`
}

export function photoFolder(opts: {
  customerName: string
  jobTitle?: string | null
  stage: PhotoStage
}) {
  const job = opts.jobTitle ? sanitizeName(opts.jobTitle, "Job") : "General"
  return `${customerFolder(opts.customerName)}/${job}/${STAGE_FOLDER[opts.stage]}`
}

/** "2026-09-29_1432_ab12cd" from the upload instant in the business timezone. */
export function photoFileName(opts: {
  at: Date
  timeZone: string
  shortId: string
  mimeType: string
}) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: opts.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(opts.at)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00"
  const stamp = `${get("year")}-${get("month")}-${get("day")}_${get("hour")}${get("minute")}`
  const ext = EXT[opts.mimeType.toLowerCase()] ?? "jpg"
  const id = opts.shortId.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "photo"
  return `${stamp}_${id}.${ext}`
}

export function photoPath(opts: {
  customerName: string
  jobTitle?: string | null
  stage: PhotoStage
  at: Date
  timeZone: string
  shortId: string
  mimeType: string
}): string {
  return `${photoFolder(opts)}/${photoFileName(opts)}`
}

/** Where an existing file should live after a rename or a stage / job change (keeps its name). */
export function relocatedPath(
  currentPath: string,
  next: { customerName: string; jobTitle?: string | null; stage: PhotoStage }
): string {
  const file = currentPath.split("/").pop() || "photo.jpg"
  return `${photoFolder(next)}/${file}`
}

export function splitPath(path: string): { folder: string; name: string } {
  const i = path.lastIndexOf("/")
  return i === -1
    ? { folder: "", name: path }
    : { folder: path.slice(0, i), name: path.slice(i + 1) }
}
