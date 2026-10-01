import "server-only"
import { AccessTokens } from "./oauth"
import type { FileResponse, StorageProvider, StoredFile, UploadTarget } from "./types"
import { StorageError, StorageRevokedError } from "./types"

// Dropbox via its HTTP API (scoped app: files.content.read / files.content.write).
// Paths are "/JobDesk/Customers/..." (inside the app folder for an App-folder app).
// fileId is Dropbox's stable "id:..." so renames and moves don't break references.

const API = "https://api.dropboxapi.com/2"
const CONTENT = "https://content.dropboxapi.com/2"

const abs = (path: string) => (path.startsWith("/") ? path : `/${path}`)

export class DropboxStorage implements StorageProvider {
  readonly kind = "DROPBOX" as const

  constructor(
    private tokens: AccessTokens,
    private fetchImpl: typeof fetch = fetch
  ) {}

  private async rpc<T>(endpoint: string, body: unknown, retry = true): Promise<T> {
    const token = await this.tokens.get()
    const res = await this.fetchImpl(`${API}/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.status === 401 && retry) {
      this.tokens.invalidate()
      return this.rpc(endpoint, body, false)
    }
    if (res.status === 401) throw new StorageRevokedError()
    if (!res.ok)
      throw new StorageError(
        `Dropbox ${endpoint} ${res.status}: ${(await res.text()).slice(0, 200)}`,
        res.status
      )
    return (await res.json()) as T
  }

  async ensureFolder(path: string) {
    // Dropbox creates parent folders on upload; create explicitly so empty folders exist too.
    try {
      await this.rpc("files/create_folder_v2", { path: abs(path), autorename: false })
    } catch (err) {
      if (!(err instanceof StorageError && err.status === 409)) throw err // 409 = already exists
    }
    return abs(path)
  }

  async createUploadSession(opts: {
    path: string
    mimeType: string
    size: number
  }): Promise<UploadTarget> {
    const { link } = await this.rpc<{ link: string }>("files/get_temporary_upload_link", {
      commit_info: { path: abs(opts.path), mode: "add", autorename: false, mute: true },
      duration: 3600,
    })
    // The browser POSTs the raw bytes to this one-time link.
    return {
      url: link,
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      ref: abs(opts.path),
    }
  }

  async finalizeUpload(opts: { path: string; ref: string }): Promise<StoredFile> {
    const meta = await this.rpc<{ ".tag": string; id: string; path_display: string }>(
      "files/get_metadata",
      {
        path: opts.ref,
      }
    )
    if (meta[".tag"] !== "file") throw new StorageError("Upload not finished", 409)
    return { fileId: meta.id, path: meta.path_display.replace(/^\//, "") }
  }

  async getFile(fileId: string, size: "thumb" | "full"): Promise<FileResponse> {
    if (size === "full") {
      const { link } = await this.rpc<{ link: string }>("files/get_temporary_link", {
        path: fileId,
      })
      return { type: "redirect", url: link, maxAgeSeconds: 300 }
    }
    const token = await this.tokens.get()
    const res = await this.fetchImpl(`${CONTENT}/files/get_thumbnail_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({
          resource: { ".tag": "path", path: fileId },
          format: "jpeg",
          size: "w640h480",
          mode: "bestfit",
        }),
      },
    })
    if (res.status === 401) throw new StorageRevokedError()
    if (!res.ok || !res.body) throw new StorageError(`Dropbox thumbnail ${res.status}`, res.status)
    return { type: "stream", body: res.body, contentType: "image/jpeg" }
  }

  webLink(file: StoredFile) {
    const folder = abs(file.path).split("/").slice(0, -1).join("/")
    return `https://www.dropbox.com/home${folder.split("/").map(encodeURIComponent).join("/")}`
  }

  async move(fileId: string, newPath: string): Promise<StoredFile> {
    const res = await this.rpc<{ metadata: { id: string; path_display: string } }>(
      "files/move_v2",
      {
        from_path: fileId,
        to_path: abs(newPath),
        autorename: false,
      }
    )
    return { fileId: res.metadata.id, path: res.metadata.path_display.replace(/^\//, "") }
  }

  async delete(fileId: string) {
    try {
      await this.rpc("files/delete_v2", { path: fileId })
    } catch (err) {
      if (!(err instanceof StorageError && err.status === 409)) throw err // already gone
    }
  }
}
