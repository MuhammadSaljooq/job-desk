import "server-only"
import { AccessTokens } from "./oauth"
import { splitPath } from "./paths"
import type { FileResponse, StorageProvider, StoredFile, UploadTarget } from "./types"
import { StorageError, StorageRevokedError } from "./types"

// Google Drive via its REST API (scope drive.file: the app only sees files it created).
// Folders are resolved by walking the path from the JobDesk root, creating what's missing.

const API = "https://www.googleapis.com/drive/v3"
const UPLOAD = "https://www.googleapis.com/upload/drive/v3"
const FOLDER = "application/vnd.google-apps.folder"

function q(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

export class GoogleDriveStorage implements StorageProvider {
  readonly kind = "GOOGLE_DRIVE" as const
  private folderIds = new Map<string, string>()

  constructor(
    private tokens: AccessTokens,
    private fetchImpl: typeof fetch = fetch
  ) {}

  private async call(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const token = await this.tokens.get()
    const res = await this.fetchImpl(url, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    })
    if (res.status === 401 && retry) {
      this.tokens.invalidate()
      return this.call(url, init, false)
    }
    if (res.status === 401) throw new StorageRevokedError()
    return res
  }

  private async json<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await this.call(url, init)
    if (!res.ok)
      throw new StorageError(
        `Google Drive ${res.status}: ${(await res.text()).slice(0, 200)}`,
        res.status
      )
    return (await res.json()) as T
  }

  async ensureFolder(path: string): Promise<string> {
    const cached = this.folderIds.get(path)
    if (cached) return cached
    let parent = "root"
    let current = ""
    for (const name of path.split("/").filter(Boolean)) {
      current = current ? `${current}/${name}` : name
      const known = this.folderIds.get(current)
      if (known) {
        parent = known
        continue
      }
      const found = await this.json<{ files: { id: string }[] }>(
        `${API}/files?` +
          new URLSearchParams({
            q: `name = '${q(name)}' and '${parent}' in parents and mimeType = '${FOLDER}' and trashed = false`,
            fields: "files(id)",
            pageSize: "1",
            spaces: "drive",
          })
      )
      let id = found.files[0]?.id
      if (!id) {
        const created = await this.json<{ id: string }>(`${API}/files?fields=id`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, mimeType: FOLDER, parents: [parent] }),
        })
        id = created.id
      }
      this.folderIds.set(current, id)
      parent = id
    }
    return parent
  }

  async createUploadSession(opts: {
    path: string
    mimeType: string
    size: number
    origin: string
  }): Promise<UploadTarget> {
    const { folder, name } = splitPath(opts.path)
    const parent = await this.ensureFolder(folder)
    // Resumable session; sending the app origin makes the session URL CORS-enabled for the browser.
    const res = await this.call(`${UPLOAD}/files?uploadType=resumable&fields=id,name`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": opts.mimeType,
        "X-Upload-Content-Length": String(opts.size),
        Origin: opts.origin,
      },
      body: JSON.stringify({ name, parents: [parent], mimeType: opts.mimeType }),
    })
    const location = res.headers.get("location")
    if (!res.ok || !location)
      throw new StorageError(`Couldn't start the Drive upload (${res.status})`, res.status)
    return { url: location, method: "PUT", headers: { "Content-Type": opts.mimeType }, ref: parent }
  }

  async finalizeUpload(opts: {
    path: string
    ref: string
    response: unknown
  }): Promise<StoredFile> {
    const id = (opts.response as { id?: unknown } | null)?.id
    if (typeof id !== "string") throw new StorageError("Drive didn't return a file id", 400)
    // Confirm the file exists in the folder we created the session for.
    const meta = await this.json<{ id: string; parents?: string[]; trashed?: boolean }>(
      `${API}/files/${encodeURIComponent(id)}?fields=id,parents,trashed`
    )
    if (meta.trashed || !meta.parents?.includes(opts.ref))
      throw new StorageError("Upload mismatch", 400)
    return { fileId: meta.id, path: opts.path }
  }

  async getFile(fileId: string, size: "thumb" | "full"): Promise<FileResponse> {
    const meta = await this.json<{ thumbnailLink?: string; mimeType: string }>(
      `${API}/files/${encodeURIComponent(fileId)}?fields=thumbnailLink,mimeType`
    )
    // thumbnailLink is a short-lived, signed image URL; its size is the "=s220" suffix.
    if (meta.thumbnailLink) {
      const px = size === "thumb" ? 480 : 1600
      return {
        type: "redirect",
        url: meta.thumbnailLink.replace(/=s\d+$/, `=s${px}`),
        maxAgeSeconds: 300,
      }
    }
    // Still processing: stream the original bytes.
    const res = await this.call(`${API}/files/${encodeURIComponent(fileId)}?alt=media`)
    if (!res.ok || !res.body) throw new StorageError(`Drive file ${res.status}`, res.status)
    return { type: "stream", body: res.body, contentType: meta.mimeType }
  }

  webLink(file: StoredFile) {
    return `https://drive.google.com/file/d/${encodeURIComponent(file.fileId)}/view`
  }

  async move(fileId: string, newPath: string): Promise<StoredFile> {
    const { folder } = splitPath(newPath)
    const target = await this.ensureFolder(folder)
    const meta = await this.json<{ parents?: string[] }>(
      `${API}/files/${encodeURIComponent(fileId)}?fields=parents`
    )
    const remove = (meta.parents ?? []).filter((p) => p !== target).join(",")
    if (remove || !(meta.parents ?? []).includes(target)) {
      await this.json(
        `${API}/files/${encodeURIComponent(fileId)}?` +
          new URLSearchParams({ addParents: target, removeParents: remove, fields: "id" }),
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }
      )
    }
    return { fileId, path: newPath }
  }

  async delete(fileId: string) {
    const res = await this.call(`${API}/files/${encodeURIComponent(fileId)}`, { method: "DELETE" })
    if (!res.ok && res.status !== 404)
      throw new StorageError(`Drive delete ${res.status}`, res.status)
  }

  async download(fileId: string) {
    const res = await this.call(`${API}/files/${encodeURIComponent(fileId)}?alt=media`)
    if (!res.ok) throw new StorageError(`Drive download ${res.status}`, res.status)
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    }
  }

  async put(path: string, bytes: Uint8Array, mimeType: string): Promise<StoredFile> {
    const { folder, name } = splitPath(path)
    const parent = await this.ensureFolder(folder)
    // multipart upload: JSON metadata + the bytes in one request
    const boundary = `jobdesk${Math.random().toString(36).slice(2)}`
    const head = new TextEncoder().encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name, parents: [parent], mimeType }) +
        `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    )
    const tail = new TextEncoder().encode(`\r\n--${boundary}--`)
    const body = new Uint8Array(head.length + bytes.length + tail.length)
    body.set(head)
    body.set(bytes, head.length)
    body.set(tail, head.length + bytes.length)
    const created = await this.json<{ id: string }>(
      `${UPLOAD}/files?uploadType=multipart&fields=id`,
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      }
    )
    return { fileId: created.id, path }
  }
}
