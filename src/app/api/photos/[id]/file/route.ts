import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { getStorageFor, StorageError, StorageRevokedError, withStorage } from "@/lib/storage"

// Short-lived provider links are cached for a few minutes so a gallery of 30 tiles doesn't
// make 30 Drive calls on every visit.
const linkCache = new Map<string, { url: string; until: number }>()

/**
 * GET /api/photos/{id}/file?size=thumb|full
 * Checks the photo belongs to the signed-in user's business, then redirects to a short-lived
 * provider link (Drive thumbnails, Dropbox temporary links) or streams the bytes.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/photos/[id]/file">) {
  const user = await getCurrentUser()
  if (!user) return new NextResponse(null, { status: 401 })
  const { id } = await ctx.params
  const size = new URL(request.url).searchParams.get("size") === "full" ? "full" : "thumb"

  const photo = await db.photo.findFirst({
    where: { id, businessId: user.businessId },
    select: { fileId: true, provider: true },
  })
  if (!photo) return new NextResponse(null, { status: 404 })

  const key = `${user.businessId}:${photo.fileId}:${size}`
  const cached = linkCache.get(key)
  if (cached && cached.until > Date.now()) return redirect(cached.url)

  const storage = await getStorageFor(user.businessId, photo.provider)
  if (!storage) return new NextResponse("Photo storage isn't connected", { status: 409 })
  try {
    const file = await withStorage(user.businessId, () => storage.getFile(photo.fileId, size))
    if (file.type === "redirect") {
      linkCache.set(key, { url: file.url, until: Date.now() + file.maxAgeSeconds * 1000 * 0.8 })
      if (linkCache.size > 2000) linkCache.clear()
      return redirect(file.url)
    }
    return new NextResponse(file.body as BodyInit, {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    })
  } catch (err) {
    if (err instanceof StorageRevokedError)
      return new NextResponse("Reconnect photo storage", { status: 409 })
    if (err instanceof StorageError && err.status === 404)
      return new NextResponse(null, { status: 404 })
    console.error("[photos/file]", err)
    return new NextResponse(null, { status: 502 })
  }
}

function redirect(url: string) {
  return new NextResponse(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "private, max-age=240" },
  })
}
