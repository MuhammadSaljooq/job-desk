import type { FileResponse, StorageProvider, StoredFile, UploadTarget } from "./types"
import { StorageError } from "./types"

/**
 * In-memory provider for unit, integration and E2E tests. `receive()` plays the browser's
 * direct upload; everything else behaves like a real provider.
 */
export class FakeStorage implements StorageProvider {
  readonly kind = "GOOGLE_DRIVE" as const
  folders = new Set<string>()
  files = new Map<string, { path: string; bytes: Uint8Array; mimeType: string }>()
  sessions = new Map<string, { path: string; mimeType: string; size: number; done?: string }>()
  private seq = 0

  async ensureFolder(path: string) {
    const parts = path.split("/")
    for (let i = 1; i <= parts.length; i++) this.folders.add(parts.slice(0, i).join("/"))
    return `folder:${path}`
  }

  async createUploadSession(opts: {
    path: string
    mimeType: string
    size: number
  }): Promise<UploadTarget> {
    const ref = `session-${++this.seq}`
    this.sessions.set(ref, { path: opts.path, mimeType: opts.mimeType, size: opts.size })
    return {
      url: `fake://upload/${ref}`,
      method: "PUT",
      headers: { "Content-Type": opts.mimeType },
      ref,
    }
  }

  /** What the browser does: send the bytes to the upload URL. Returns the provider response. */
  receive(ref: string, bytes: Uint8Array) {
    const s = this.sessions.get(ref)
    if (!s) throw new StorageError("Unknown upload session", 404)
    const id = `file-${++this.seq}`
    this.files.set(id, { path: s.path, bytes, mimeType: s.mimeType })
    s.done = id
    return { id }
  }

  async finalizeUpload(opts: { ref: string; response: unknown }): Promise<StoredFile> {
    const s = this.sessions.get(opts.ref)
    const id = (opts.response as { id?: string } | null)?.id
    if (!s?.done || s.done !== id) throw new StorageError("Upload not finished", 409)
    this.sessions.delete(opts.ref)
    return { fileId: id, path: s.path }
  }

  async getFile(fileId: string): Promise<FileResponse> {
    const f = this.files.get(fileId)
    if (!f) throw new StorageError("Not found", 404)
    return { type: "stream", body: f.bytes, contentType: f.mimeType }
  }

  webLink(file: StoredFile) {
    return `https://fake.example/${encodeURIComponent(file.fileId)}`
  }

  async move(fileId: string, newPath: string): Promise<StoredFile> {
    const f = this.files.get(fileId)
    if (!f) throw new StorageError("Not found", 404)
    f.path = newPath
    return { fileId, path: newPath }
  }

  async delete(fileId: string) {
    this.files.delete(fileId)
  }
}
