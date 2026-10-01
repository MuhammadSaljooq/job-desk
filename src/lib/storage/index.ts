import "server-only"
import { db } from "@/lib/db"
import { decrypt } from "@/lib/crypto"
import { DevLocalStorage, devLocalEnabled } from "./dev-local"
import { DropboxStorage } from "./dropbox"
import { GoogleDriveStorage } from "./google-drive"
import { AccessTokens } from "./oauth"
import type { ProviderKind, StorageProvider } from "./types"
import { StorageRevokedError } from "./types"

export * from "./types"

// Tests swap the real providers for FakeStorage.
let override: ((businessId: string) => StorageProvider | null) | null = null
export function setStorageOverride(fn: typeof override) {
  override = fn
}

export type StorageStatus =
  | {
      state: "connected"
      provider: ProviderKind
      accountEmail: string
      rootFolderId: string | null
    }
  | { state: "revoked"; provider: ProviderKind; accountEmail: string }
  | { state: "dev-local" }
  | { state: "none" }

/** What the UI shows: connected, needs reconnecting, dev storage, or nothing yet. */
export async function storageStatus(businessId: string): Promise<StorageStatus> {
  if (override)
    return override(businessId)
      ? {
          state: "connected",
          provider: "GOOGLE_DRIVE",
          accountEmail: "test@example.com",
          rootFolderId: null,
        }
      : { state: "none" }
  const conn = await db.storageConnection.findUnique({ where: { businessId } })
  if (conn?.status === "ACTIVE") {
    return {
      state: "connected",
      provider: conn.provider,
      accountEmail: conn.accountEmail,
      rootFolderId: conn.rootFolderId,
    }
  }
  if (conn?.status === "REVOKED")
    return { state: "revoked", provider: conn.provider, accountEmail: conn.accountEmail }
  return devLocalEnabled() ? { state: "dev-local" } : { state: "none" }
}

/**
 * The provider for a business's connected storage, or null when nothing is connected.
 * Falls back to the dev-only local provider when STORAGE_DEV_LOCAL=1 outside production.
 */
export async function getStorage(businessId: string): Promise<StorageProvider | null> {
  if (override) return override(businessId)
  const conn = await db.storageConnection.findUnique({ where: { businessId } })
  if (conn?.status === "ACTIVE") {
    const tokens = new AccessTokens(
      conn.provider === "GOOGLE_DRIVE" ? "google" : "dropbox",
      decrypt(conn.encryptedRefreshToken)
    )
    if (conn.provider === "GOOGLE_DRIVE") return new GoogleDriveStorage(tokens)
    if (conn.provider === "DROPBOX") return new DropboxStorage(tokens)
  }
  if (!conn && devLocalEnabled()) return new DevLocalStorage(businessId)
  return null
}

/** The provider a stored photo lives in (it may differ from the current connection). */
export async function getStorageFor(
  businessId: string,
  kind: ProviderKind
): Promise<StorageProvider | null> {
  if (override) return override(businessId)
  if (kind === "DEV_LOCAL") return devLocalEnabled() ? new DevLocalStorage(businessId) : null
  const s = await getStorage(businessId)
  return s?.kind === kind ? s : null
}

/** Run a storage call; a revoked token marks the connection so the UI shows "Reconnect". */
export async function withStorage<T>(businessId: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof StorageRevokedError) {
      await db.storageConnection.updateMany({ where: { businessId }, data: { status: "REVOKED" } })
    }
    throw err
  }
}
