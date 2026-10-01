import { NextResponse } from "next/server"
import { DevLocalStorage, devLocalEnabled } from "@/lib/storage/dev-local"
import { StorageError } from "@/lib/storage/types"

/** DEVELOPMENT ONLY: receives the direct upload for the local dev storage provider. */
export async function PUT(request: Request) {
  if (!devLocalEnabled()) return new NextResponse(null, { status: 404 })
  const token = new URL(request.url).searchParams.get("t") ?? ""
  try {
    const result = await DevLocalStorage.receive(token, await request.arrayBuffer())
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StorageError) {
      return NextResponse.json({ error: err.message }, { status: err.status ?? 400 })
    }
    throw err
  }
}
