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

// Tests swap the real providers for FakeStorage (`kind` is set when a specific provider is
// asked for, e.g. a photo still on the previous provider while switching).
let override: ((businessId: string, kind?: ProviderKind) => StorageProvider | null) | null = null
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
  if (
    conn?.status === "ACTIVE" &&
    (conn.provider === "GOOGLE_DRIVE" || conn.provider === "DROPBOX")
  )
    return providerFor(conn.provider, conn.encryptedRefreshToken)
  if (!conn && devLocalEnabled()) return new DevLocalStorage(businessId)
  return null
}

function providerFor(kind: "GOOGLE_DRIVE" | "DROPBOX", encryptedRefreshToken: string) {
  const tokens = new AccessTokens(
    kind === "GOOGLE_DRIVE" ? "google" : "dropbox",
    decrypt(encryptedRefreshToken)
  )
  return kind === "GOOGLE_DRIVE" ? new GoogleDriveStorage(tokens) : new DropboxStorage(tokens)
}

/**
 * The provider a stored photo lives in. It may differ from the current connection: while
 * switching provider (D17) the old one is kept as `previous*` until its photos are copied.
 */
export async function getStorageFor(
  businessId: string,
  kind: ProviderKind
): Promise<StorageProvider | null> {
  if (override) return override(businessId, kind)
  if (kind === "DEV_LOCAL") return devLocalEnabled() ? new DevLocalStorage(businessId) : null
  const s = await getStorage(businessId)
  if (s?.kind === kind) return s
  const conn = await db.storageConnection.findUnique({
    where: { businessId },
    select: { previousProvider: true, previousEncryptedRefreshToken: true },
  })
  if (
    conn?.previousProvider === kind &&
    conn.previousEncryptedRefreshToken &&
    (kind === "GOOGLE_DRIVE" || kind === "DROPBOX")
  )
    return providerFor(kind, conn.previousEncryptedRefreshToken)
  return null
}

/** "Open folder" link for the connected JobDesk folder. */
export function folderLink(provider: ProviderKind, rootFolderId: string | null): string | null {
  if (provider === "GOOGLE_DRIVE")
    return rootFolderId
      ? `https://drive.google.com/drive/folders/${encodeURIComponent(rootFolderId)}`
      : "https://drive.google.com/drive/my-drive"
  if (provider === "DROPBOX")
    return `https://www.dropbox.com/home${(rootFolderId ?? "/JobDesk").split("/").map(encodeURIComponent).join("/")}`
  return null
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
