import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GoogleDriveStorage } from "@/lib/storage/google-drive"
import { DropboxStorage } from "@/lib/storage/dropbox"
import { AccessTokens } from "@/lib/storage/oauth"
import { StorageRevokedError } from "@/lib/storage/types"

// The real providers against a scripted fetch, checking the exact API calls they make.

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown }

function scripted(handler: (c: Call) => Response | Promise<Response>) {
  const calls: Call[] = []
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = Object.fromEntries(new Headers(init?.headers).entries())
    let body: unknown = init?.body
    if (typeof body === "string") {
      try {
        body = JSON.parse(body)
      } catch {
        /* form body */
      }
    }
    const call = { url: String(input), method: init?.method ?? "GET", headers, body }
    calls.push(call)
    return handler(call)
  }) as typeof fetch
  return { impl, calls }
}

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  })

// Token refreshes go through global fetch (oauth.ts).
let refreshes = 0
beforeEach(() => {
  refreshes = 0
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("token")) {
        refreshes++
        return json({ access_token: `access-${refreshes}`, expires_in: 3600 })
      }
      return new Response("unexpected", { status: 500 })
    })
  )
})
afterEach(() => vi.unstubAllGlobals())

describe("Google Drive provider", () => {
  it("creates the folder chain once, then starts a CORS-enabled resumable upload", async () => {
    const folders = new Map<string, string>()
    const { impl, calls } = scripted(async (c) => {
      if (c.url.includes("/drive/v3/files?q=")) {
        const name =
          /name = '([^']+)'/.exec(decodeURIComponent(c.url.replace(/\+/g, " ")))?.[1] ?? ""
        return json({ files: folders.has(name) ? [{ id: folders.get(name) }] : [] })
      }
      if (c.url.endsWith("/drive/v3/files?fields=id") && c.method === "POST") {
        const name = (c.body as { name: string }).name
        const id = `fld-${name}`
        folders.set(name, id)
        return json({ id })
      }
      if (c.url.includes("/upload/drive/v3/files?uploadType=resumable")) {
        return new Response(null, {
          status: 200,
          headers: { Location: "https://upload.example/session-1" },
        })
      }
      return new Response("?", { status: 404 })
    })
    const drive = new GoogleDriveStorage(new AccessTokens("google", "refresh"), impl)
    const target = await drive.createUploadSession({
      path: "JobDesk/Customers/Sarah Mitchell/General/Before/2026-09-29_1432_ab.jpg",
      mimeType: "image/jpeg",
      size: 1000,
      origin: "https://app.example",
    })
    expect(target).toEqual({
      url: "https://upload.example/session-1",
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      ref: "fld-Before",
    })
    const start = calls.find((c) => c.url.includes("uploadType=resumable"))!
    expect(start.headers.origin).toBe("https://app.example")
    expect(start.headers["x-upload-content-length"]).toBe("1000")
    expect(start.body).toMatchObject({ name: "2026-09-29_1432_ab.jpg", parents: ["fld-Before"] })
    expect(start.headers.authorization).toBe("Bearer access-1")
    // JobDesk, Customers, Sarah Mitchell, General, Before
    expect(calls.filter((c) => c.method === "POST" && c.url.endsWith("fields=id"))).toHaveLength(5)
    // second upload reuses the cached folder ids and token
    await drive.createUploadSession({
      path: "JobDesk/Customers/Sarah Mitchell/General/Before/x.jpg",
      mimeType: "image/jpeg",
      size: 1,
      origin: "https://app.example",
    })
    expect(calls.filter((c) => c.url.includes("?q="))).toHaveLength(5)
    expect(refreshes).toBe(1)
  })

  it("serves resized thumbnail links and finalizes only files in the session folder", async () => {
    const { impl } = scripted(async (c) => {
      if (c.url.includes("fields=thumbnailLink")) {
        return json({
          thumbnailLink: "https://lh3.googleusercontent.com/abc=s220",
          mimeType: "image/jpeg",
        })
      }
      if (c.url.includes("fields=id,parents,trashed"))
        return json({ id: "f1", parents: ["fld-ok"], trashed: false })
      return new Response("?", { status: 404 })
    })
    const drive = new GoogleDriveStorage(new AccessTokens("google", "r"), impl)
    expect(await drive.getFile("f1", "thumb")).toEqual({
      type: "redirect",
      url: "https://lh3.googleusercontent.com/abc=s480",
      maxAgeSeconds: 300,
    })
    expect(
      (await drive.getFile("f1", "full")).type === "redirect" && (await drive.getFile("f1", "full"))
    ).toMatchObject({
      url: "https://lh3.googleusercontent.com/abc=s1600",
    })
    expect(
      await drive.finalizeUpload({ path: "p/x.jpg", ref: "fld-ok", response: { id: "f1" } })
    ).toEqual({
      fileId: "f1",
      path: "p/x.jpg",
    })
    await expect(
      drive.finalizeUpload({ path: "p/x.jpg", ref: "fld-other", response: { id: "f1" } })
    ).rejects.toThrow(/mismatch/)
  })

  it("retries once with a fresh token, then reports a revoked connection", async () => {
    const { impl } = scripted(async () => new Response("unauthorized", { status: 401 }))
    const drive = new GoogleDriveStorage(new AccessTokens("google", "r"), impl)
    await expect(drive.delete("f1")).rejects.toBeInstanceOf(StorageRevokedError)
    expect(refreshes).toBe(2)
  })

  it("flags invalid_grant on refresh as revoked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: "invalid_grant" }, { status: 400 }))
    )
    const tokens = new AccessTokens("google", "dead")
    await expect(tokens.get()).rejects.toBeInstanceOf(StorageRevokedError)
  })
})

describe("Dropbox provider", () => {
  it("uploads through a temporary link and finalizes by path", async () => {
    const { impl, calls } = scripted(async (c) => {
      if (c.url.endsWith("files/get_temporary_upload_link"))
        return json({ link: "https://content.dropbox/up/1" })
      if (c.url.endsWith("files/get_metadata"))
        return json({
          ".tag": "file",
          id: "id:abc",
          path_display: "/JobDesk/Customers/X/General/After/a.jpg",
        })
      return new Response("?", { status: 404 })
    })
    const dbx = new DropboxStorage(new AccessTokens("dropbox", "r"), impl)
    const target = await dbx.createUploadSession({
      path: "JobDesk/Customers/X/General/After/a.jpg",
      mimeType: "image/jpeg",
      size: 9,
    })
    expect(target).toMatchObject({ url: "https://content.dropbox/up/1", method: "POST" })
    expect(calls[0].body).toMatchObject({
      commit_info: {
        path: "/JobDesk/Customers/X/General/After/a.jpg",
        mode: "add",
        autorename: false,
      },
    })
    expect(await dbx.finalizeUpload({ path: "ignored", ref: target.ref })).toEqual({
      fileId: "id:abc",
      path: "JobDesk/Customers/X/General/After/a.jpg",
    })
  })

  it("links, thumbnails, moves and deletes by stable id", async () => {
    const { impl, calls } = scripted(async (c) => {
      if (c.url.endsWith("files/get_temporary_link"))
        return json({ link: "https://dl.dropbox/tmp" })
      if (c.url.endsWith("files/get_thumbnail_v2"))
        return new Response(new Uint8Array([1, 2]), { status: 200 })
      if (c.url.endsWith("files/move_v2"))
        return json({
          metadata: { id: "id:abc", path_display: "/JobDesk/Customers/Y/General/After/a.jpg" },
        })
      if (c.url.endsWith("files/delete_v2"))
        return new Response("path_lookup/not_found", { status: 409 })
      return new Response("?", { status: 404 })
    })
    const dbx = new DropboxStorage(new AccessTokens("dropbox", "r"), impl)
    expect(await dbx.getFile("id:abc", "full")).toMatchObject({
      type: "redirect",
      url: "https://dl.dropbox/tmp",
    })
    const thumb = await dbx.getFile("id:abc", "thumb")
    expect(thumb).toMatchObject({ type: "stream", contentType: "image/jpeg" })
    expect(JSON.parse(calls[1].headers["dropbox-api-arg"]).resource).toEqual({
      ".tag": "path",
      path: "id:abc",
    })
    expect(await dbx.move("id:abc", "JobDesk/Customers/Y/General/After/a.jpg")).toEqual({
      fileId: "id:abc",
      path: "JobDesk/Customers/Y/General/After/a.jpg",
    })
    await expect(dbx.delete("id:gone")).resolves.toBeUndefined() // 409 = already deleted
  })
})
