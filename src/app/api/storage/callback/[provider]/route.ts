import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { encrypt, verifyToken } from "@/lib/crypto"
import { AccessTokens, appUrl, exchangeCode, type OAuthProvider } from "@/lib/storage/oauth"
import { GoogleDriveStorage } from "@/lib/storage/google-drive"
import { DropboxStorage } from "@/lib/storage/dropbox"
import { ROOT_FOLDER } from "@/lib/storage/paths"

type State = { b: string; u: string; n: string; p: OAuthProvider }

async function accountEmail(provider: OAuthProvider, accessToken: string): Promise<string> {
  if (provider === "google") {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = (await res.json().catch(() => ({}))) as { email?: string }
    return data.email ?? "Google account"
  }
  const res = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = (await res.json().catch(() => ({}))) as { email?: string }
  return data.email ?? "Dropbox account"
}

/**
 * GET /api/storage/callback/google|dropbox: finishes OAuth. Verifies the signed state and
 * the browser nonce, exchanges the code, creates the JobDesk folder and stores the refresh
 * token encrypted (AES-256-GCM). One connection per business: reconnecting the same provider
 * replaces it; a different provider keeps the old one as `previous*` until photos are copied.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/storage/callback/[provider]">) {
  const { provider } = await ctx.params
  const url = new URL(request.url)
  const fail = (reason: string) =>
    NextResponse.redirect(`${appUrl()}/settings?storage=error&reason=${reason}`)
  if (provider !== "google" && provider !== "dropbox")
    return new NextResponse(null, { status: 404 })
  if (url.searchParams.get("error")) return fail("denied")

  const jar = await cookies()
  const nonce = jar.get("jd_oauth_nonce")?.value
  jar.delete({ name: "jd_oauth_nonce", path: "/api/storage/callback" })
  const state = verifyToken<State>(url.searchParams.get("state"))
  const user = await getCurrentUser()
  if (!state || !nonce || state.n !== nonce || state.p !== provider) return fail("state")
  if (!user || user.userId !== state.u || user.businessId !== state.b || user.role !== "OWNER")
    return fail("user")

  const code = url.searchParams.get("code")
  if (!code) return fail("code")
  try {
    const tokens = await exchangeCode(provider, code)
    if (!tokens.refresh_token) return fail("offline")
    const email = await accountEmail(provider, tokens.access_token)
    const access = new AccessTokens(provider, tokens.refresh_token)
    const storage =
      provider === "google" ? new GoogleDriveStorage(access) : new DropboxStorage(access)
    const rootFolderId = await storage.ensureFolder(`${ROOT_FOLDER}/Customers`)
    const data = {
      provider: provider === "google" ? ("GOOGLE_DRIVE" as const) : ("DROPBOX" as const),
      accountEmail: email,
      encryptedRefreshToken: encrypt(tokens.refresh_token),
      rootFolderId,
      status: "ACTIVE" as const,
      connectedById: user.userId,
    }
    const existing = await db.storageConnection.findUnique({
      where: { businessId: user.businessId },
    })
    // Switching provider (D17): keep the old connection until its photos are copied across.
    let previous = {}
    if (existing && existing.provider !== data.provider) {
      if (existing.previousProvider && existing.previousProvider !== data.provider)
        return fail("copying") // a third provider while photos are still on the first
      const onOld = await db.photo.count({
        where: { businessId: user.businessId, provider: existing.provider },
      })
      previous =
        onOld > 0 && existing.status === "ACTIVE"
          ? {
              previousProvider: existing.provider,
              previousAccountEmail: existing.accountEmail,
              previousEncryptedRefreshToken: existing.encryptedRefreshToken,
              previousRootFolderId: existing.rootFolderId,
            }
          : {
              previousProvider: null,
              previousAccountEmail: null,
              previousEncryptedRefreshToken: null,
              previousRootFolderId: null,
            }
    }
    await db.storageConnection.upsert({
      where: { businessId: user.businessId },
      create: { businessId: user.businessId, ...data },
      update: { ...data, ...previous },
    })
    return NextResponse.redirect(`${appUrl()}/settings?storage=connected`)
  } catch (err) {
    console.error("[storage/callback]", err)
    return fail("exchange")
  }
}
