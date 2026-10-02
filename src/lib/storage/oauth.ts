import "server-only"
import { StorageError, StorageRevokedError } from "./types"

// OAuth details for the two providers. Scopes are the minimum the app needs:
//  - Google: drive.file (only files this app created) + email to show the account
//  - Dropbox: files.content.read/write + account_info.read for the email

export type OAuthProvider = "google" | "dropbox"

/**
 * The public URL of the app (OAuth redirects). APP_URL wins; on Vercel it falls back to the
 * project's production domain so OAuth never points at localhost by accident.
 */
export function appUrl(): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const url = process.env.APP_URL || (vercel ? `https://${vercel}` : "http://localhost:3210")
  return url.replace(/\/+$/, "")
}

export function redirectUri(provider: OAuthProvider) {
  return `${appUrl()}/api/storage/callback/${provider}`
}

export function oauthConfigured(provider: OAuthProvider): boolean {
  return provider === "google"
    ? !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : !!(process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET)
}

export function authorizeUrl(provider: OAuthProvider, state: string): string {
  if (provider === "google") {
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    u.search = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      redirect_uri: redirectUri("google"),
      response_type: "code",
      scope: "openid email https://www.googleapis.com/auth/drive.file",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    }).toString()
    return u.toString()
  }
  const u = new URL("https://www.dropbox.com/oauth2/authorize")
  u.search = new URLSearchParams({
    client_id: process.env.DROPBOX_APP_KEY ?? "",
    redirect_uri: redirectUri("dropbox"),
    response_type: "code",
    token_access_type: "offline",
    scope: "files.content.read files.content.write files.metadata.read account_info.read",
    state,
  }).toString()
  return u.toString()
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number }

async function postForm(url: string, body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  })
  const json = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string }
  if (!res.ok) {
    if (json.error === "invalid_grant") throw new StorageRevokedError()
    throw new StorageError(`Token request failed (${json.error ?? res.status})`, res.status)
  }
  return json
}

export function exchangeCode(provider: OAuthProvider, code: string) {
  return provider === "google"
    ? postForm("https://oauth2.googleapis.com/token", {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: redirectUri("google"),
        grant_type: "authorization_code",
      })
    : postForm("https://api.dropboxapi.com/oauth2/token", {
        code,
        client_id: process.env.DROPBOX_APP_KEY ?? "",
        client_secret: process.env.DROPBOX_APP_SECRET ?? "",
        redirect_uri: redirectUri("dropbox"),
        grant_type: "authorization_code",
      })
}

export function refreshAccessToken(provider: OAuthProvider, refreshToken: string) {
  return provider === "google"
    ? postForm("https://oauth2.googleapis.com/token", {
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
      })
    : postForm("https://api.dropboxapi.com/oauth2/token", {
        refresh_token: refreshToken,
        client_id: process.env.DROPBOX_APP_KEY ?? "",
        client_secret: process.env.DROPBOX_APP_SECRET ?? "",
        grant_type: "refresh_token",
      })
}

/**
 * Caches access tokens per connection and refreshes them a minute before they expire.
 * A revoked refresh token raises StorageRevokedError so the caller can mark the
 * connection and show "Reconnect".
 */
export class AccessTokens {
  private token: string | null = null
  private expiresAt = 0
  constructor(
    private provider: OAuthProvider,
    private refreshToken: string,
    private now: () => number = Date.now
  ) {}

  async get(): Promise<string> {
    if (this.token && this.now() < this.expiresAt - 60_000) return this.token
    const t = await refreshAccessToken(this.provider, this.refreshToken)
    this.token = t.access_token
    this.expiresAt = this.now() + (t.expires_in ?? 3600) * 1000
    return this.token
  }

  invalidate() {
    this.token = null
  }
}
