import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { randomBytes } from "node:crypto"
import { getCurrentUser } from "@/lib/auth"
import { signToken } from "@/lib/crypto"
import { appUrl, authorizeUrl, oauthConfigured, type OAuthProvider } from "@/lib/storage/oauth"

/** GET /api/storage/connect/google|dropbox: owner only. Starts the provider's OAuth flow. */
export async function GET(_request: Request, ctx: RouteContext<"/api/storage/connect/[provider]">) {
  const { provider } = await ctx.params
  if (provider !== "google" && provider !== "dropbox")
    return new NextResponse(null, { status: 404 })
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(`${appUrl()}/login?next=/settings`)
  if (user.role !== "OWNER") return NextResponse.redirect(`${appUrl()}/settings?storage=owner-only`)
  if (!oauthConfigured(provider as OAuthProvider)) {
    return NextResponse.redirect(`${appUrl()}/settings?storage=not-configured&provider=${provider}`)
  }
  // State = signed {business, user, nonce}; the nonce is also in an httpOnly cookie, so a
  // callback can only complete in the browser that started it (CSRF protection).
  const nonce = randomBytes(16).toString("base64url")
  const state = signToken({ b: user.businessId, u: user.userId, n: nonce, p: provider }, 10 * 60)
  const jar = await cookies()
  jar.set("jd_oauth_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/storage/callback",
    maxAge: 10 * 60,
  })
  return NextResponse.redirect(authorizeUrl(provider as OAuthProvider, state))
}
