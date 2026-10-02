import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

/** GET /api/settings/logo: the business's small logo copy (D15), for signed-in members. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return new NextResponse(null, { status: 401 })
  const b = await db.business.findUnique({
    where: { id: user.businessId },
    select: { logoThumb: true, logoMime: true },
  })
  if (!b?.logoThumb || !b.logoMime) return new NextResponse(null, { status: 404 })
  return new NextResponse(new Uint8Array(b.logoThumb), {
    headers: {
      "Content-Type": b.logoMime,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
