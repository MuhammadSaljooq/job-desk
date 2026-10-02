import "server-only"
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { signToken, verifyToken } from "@/lib/crypto"
import type { FileResponse, StorageProvider, StoredFile, UploadTarget } from "./types"
import { MAX_PHOTO_BYTES, StorageError } from "./types"

// DEVELOPMENT ONLY. Stores photos on local disk under .storage/{businessId}/ so the photo
// features work before Google Drive / Dropbox are connected. Enabled by STORAGE_DEV_LOCAL=1
// and refused in production, because photos must never live on our servers.

const ROOT = path.resolve(process.cwd(), ".storage")

export function devLocalEnabled() {
  return process.env.STORAGE_DEV_LOCAL === "1" && process.env.NODE_ENV !== "production"
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".svg": "image/svg+xml",
}

/** Resolve a business-relative path under .storage, refusing anything that escapes it. */
export function safeLocalPath(businessId: string, relative: string): string {
  const base = path.join(ROOT, businessId.replace(/[^a-z0-9_-]/gi, ""))
  const full = path.resolve(base, relative.replace(/^\/+/, ""))
  if (full !== base && !full.startsWith(base + path.sep)) throw new StorageError("Bad path", 400)
  return full
}

export class DevLocalStorage implements StorageProvider {
  readonly kind = "DEV_LOCAL" as const
  constructor(private businessId: string) {
    if (!devLocalEnabled()) throw new Error("DEV_LOCAL storage is disabled")
  }

  async ensureFolder(folder: string) {
    await mkdir(safeLocalPath(this.businessId, folder), { recursive: true })
    return folder
  }

  async createUploadSession(opts: {
    path: string
    mimeType: string
    size: number
    origin: string
  }): Promise<UploadTarget> {
    const token = signToken({ b: this.businessId, p: opts.path, m: opts.mimeType }, 15 * 60)
    return {
      url: `${opts.origin}/api/storage/dev-upload?t=${encodeURIComponent(token)}`,
      method: "PUT",
      headers: { "Content-Type": opts.mimeType },
      ref: opts.path,
    }
  }

  /** Called by /api/storage/dev-upload with the raw body. */
  static async receive(token: string, body: ArrayBuffer) {
    const data = verifyToken<{ b: string; p: string; m: string }>(token)
    if (!data) throw new StorageError("Upload link expired", 403)
    if (body.byteLength > MAX_PHOTO_BYTES) throw new StorageError("File too large", 413)
    const full = safeLocalPath(data.b, data.p)
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, new Uint8Array(body))
    return { id: data.p }
  }

  async finalizeUpload(opts: { path: string; ref: string }): Promise<StoredFile> {
    if (opts.ref !== opts.path) throw new StorageError("Upload mismatch", 400)
    try {
      await stat(safeLocalPath(this.businessId, opts.path))
    } catch {
      throw new StorageError("Upload not finished", 409)
    }
    return { fileId: opts.path, path: opts.path }
  }

  async getFile(fileId: string): Promise<FileResponse> {
    const full = safeLocalPath(this.businessId, fileId)
    try {
      const bytes = await readFile(full)
      return {
        type: "stream",
        body: new Uint8Array(bytes),
        contentType: MIME[path.extname(full).toLowerCase()] ?? "application/octet-stream",
      }
    } catch {
      throw new StorageError("Not found", 404)
    }
  }

  webLink(file: StoredFile) {
    return `/api/photos/by-path?p=${encodeURIComponent(file.path)}`
  }

  async move(fileId: string, newPath: string): Promise<StoredFile> {
    if (fileId === newPath) return { fileId, path: newPath }
    const from = safeLocalPath(this.businessId, fileId)
    const to = safeLocalPath(this.businessId, newPath)
    await mkdir(path.dirname(to), { recursive: true })
    await rename(from, to)
    return { fileId: newPath, path: newPath }
  }

  async delete(fileId: string) {
    await rm(safeLocalPath(this.businessId, fileId), { force: true })
  }

  async download(fileId: string) {
    const res = await this.getFile(fileId)
    if (res.type !== "stream" || !(res.body instanceof Uint8Array))
      throw new StorageError("Not found", 404)
    return { bytes: res.body, contentType: res.contentType }
  }

  async put(relative: string, bytes: Uint8Array): Promise<StoredFile> {
    const full = safeLocalPath(this.businessId, relative)
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, bytes, { flag: "wx" }).catch(async (err: NodeJS.ErrnoException) => {
      if (err.code !== "EEXIST") throw err
    })
    return { fileId: relative, path: relative }
  }
}
