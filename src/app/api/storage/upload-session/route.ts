import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { ActionError } from "@/lib/action"
import { StorageError, StorageRevokedError } from "@/lib/storage"
import { startUpload } from "@/features/photos/service"

/**
 * POST /api/storage/upload-session
 * Body: { customerId, jobId?, stage, mimeType, size }. Checks access, type and size, then
 * returns the provider's direct upload URL and a signed token for savePhotosAction.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
  const origin = request.headers.get("origin") ?? new URL(request.url).origin
  try {
    const result = await startUpload(user, body as never, origin)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid upload" },
        { status: 400 }
      )
    }
    if (err instanceof ActionError)
      return NextResponse.json({ error: err.message }, { status: 400 })
    if (err instanceof StorageRevokedError) {
      return NextResponse.json({ error: err.message, reconnect: true }, { status: 409 })
    }
    if (err instanceof StorageError) {
      console.error("[upload-session]", err)
      return NextResponse.json(
        { error: "The photo service didn't respond. Try again." },
        { status: 502 }
      )
    }
    throw err
  }
}
