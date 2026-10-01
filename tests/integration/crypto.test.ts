import { describe, expect, it } from "vitest"
import { decrypt, encrypt, signToken, verifyToken } from "@/lib/crypto"

// Lives in the integration project because it needs the server env (.env keys).
describe("token encryption (AES-256-GCM)", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = encrypt("1//refresh-token-abc")
    const b = encrypt("1//refresh-token-abc")
    expect(a).not.toBe(b)
    expect(a.startsWith("v1.")).toBe(true)
    expect(decrypt(a)).toBe("1//refresh-token-abc")
    expect(decrypt(b)).toBe("1//refresh-token-abc")
  })
  it("rejects tampering", () => {
    const [v, iv, tag, ct] = encrypt("secret").split(".")
    const flipped = ct.slice(0, -2) + (ct.endsWith("A") ? "B" : "A") + ct.slice(-1)
    expect(() => decrypt([v, iv, tag, flipped].join("."))).toThrow()
    expect(() => decrypt("garbage")).toThrow()
  })
})

describe("signed tokens", () => {
  it("verifies its own tokens until they expire", () => {
    const now = Date.now()
    const t = signToken({ businessId: "b1", path: "x" }, 60, now)
    expect(verifyToken<{ businessId: string }>(t, now)?.businessId).toBe("b1")
    expect(verifyToken(t, now + 61_000)).toBeNull()
  })
  it("rejects edits and junk", () => {
    const t = signToken({ businessId: "b1" }, 60)
    const [body, sig] = t.split(".")
    const forged = Buffer.from(JSON.stringify({ businessId: "b2", exp: 9e9 })).toString("base64url")
    expect(verifyToken(`${forged}.${sig}`)).toBeNull()
    expect(verifyToken(`${body}.AAAA`)).toBeNull()
    expect(verifyToken("nope")).toBeNull()
    expect(verifyToken(42)).toBeNull()
  })
})
