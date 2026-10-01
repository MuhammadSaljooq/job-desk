import "server-only"
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"

// AES-256-GCM for OAuth refresh tokens at rest (StorageConnection.encryptedRefreshToken).
// Format: v1.<iv b64url>.<auth tag b64url>.<ciphertext b64url>
// Key: TOKEN_ENCRYPTION_KEY, 32 bytes base64 (`openssl rand -base64 32`).

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not set")
  const k = Buffer.from(raw, "base64")
  if (k.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (base64)")
  return k
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(
    "."
  )
}

export function decrypt(payload: string): string {
  const [version, iv, tag, ct] = payload.split(".")
  if (version !== "v1" || !iv || !tag || !ct) throw new Error("Unrecognised encrypted value")
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString(
    "utf8"
  )
}

// Short-lived signed tokens (upload sessions, OAuth state). HMAC-SHA256 with AUTH_SECRET.

function secret(): string {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error("AUTH_SECRET is not set")
  return s
}

export function signToken(
  data: Record<string, unknown>,
  ttlSeconds: number,
  now = Date.now()
): string {
  const body = Buffer.from(
    JSON.stringify({ ...data, exp: Math.floor(now / 1000) + ttlSeconds })
  ).toString("base64url")
  const sig = createHmac("sha256", secret()).update(body).digest("base64url")
  return `${body}.${sig}`
}

/** The token's data, or null when tampered with or expired. */
export function verifyToken<T extends Record<string, unknown>>(
  token: unknown,
  now = Date.now()
): T | null {
  if (typeof token !== "string") return null
  const [body, sig] = token.split(".")
  if (!body || !sig) return null
  const expected = createHmac("sha256", secret()).update(body).digest()
  const given = Buffer.from(sig, "base64url")
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp: number }
    if (typeof data.exp !== "number" || data.exp * 1000 < now) return null
    return data
  } catch {
    return null
  }
}
