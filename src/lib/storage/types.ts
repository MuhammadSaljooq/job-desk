// The storage abstraction. Photos live in the business's own Google Drive or Dropbox;
// our database only keeps provider + fileId + path. Every call to a provider SDK/API goes
// through an implementation of StorageProvider (CLAUDE.md > Code rules).

export type ProviderKind = "GOOGLE_DRIVE" | "DROPBOX" | "DEV_LOCAL"

/** Where the browser sends the file bytes directly (never through our server in production). */
export type UploadTarget = {
  url: string
  method: "PUT" | "POST"
  headers: Record<string, string>
  /** opaque value finalizeUpload needs (session id, intended path, ...) */
  ref: string
}

export type StoredFile = { fileId: string; path: string }

export type FileResponse =
  | { type: "redirect"; url: string; maxAgeSeconds: number }
  | { type: "stream"; body: ReadableStream<Uint8Array> | Uint8Array; contentType: string }

export interface StorageProvider {
  readonly kind: ProviderKind
  /** Make sure a folder exists; returns the provider's folder id (or the path itself). */
  ensureFolder(path: string): Promise<string>
  /** Start an upload the browser completes itself. `origin` lets Google set CORS. */
  createUploadSession(opts: {
    path: string
    mimeType: string
    size: number
    origin: string
  }): Promise<UploadTarget>
  /** After the browser finished: confirm the file exists and return its id. */
  finalizeUpload(opts: { path: string; ref: string; response: unknown }): Promise<StoredFile>
  /** Bytes or a short-lived link for a thumbnail (~480px) or the full image. */
  getFile(fileId: string, size: "thumb" | "full"): Promise<FileResponse>
  /** Link to open the file in Drive / Dropbox itself. */
  webLink(file: StoredFile): string
  /** Move (and keep the name of) a file to a new path; returns the new path. */
  move(fileId: string, newPath: string): Promise<StoredFile>
  delete(fileId: string): Promise<void>
}

/** The connection was revoked or the refresh token no longer works: show "Reconnect". */
export class StorageRevokedError extends Error {
  constructor(message = "Photo storage needs to be reconnected.") {
    super(message)
  }
}

/** Something on the provider side failed (network, quota, 5xx). */
export class StorageError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message)
  }
}

export const MAX_PHOTO_BYTES = 15 * 1024 * 1024
export const ALLOWED_PHOTO_TYPES = /^image\/(jpeg|jpg|png|webp|heic|heif|gif)$/i
