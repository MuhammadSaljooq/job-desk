import { describe, expect, it } from "vitest"
import {
  photoFileName,
  photoFolder,
  photoPath,
  relocatedPath,
  sanitizeName,
} from "@/lib/storage/paths"

describe("sanitizeName", () => {
  it("keeps normal names", () => {
    expect(sanitizeName("Sarah Mitchell")).toBe("Sarah Mitchell")
    expect(sanitizeName("Unit 12 turnover repairs")).toBe("Unit 12 turnover repairs")
    expect(sanitizeName('TV & Mounting (65")')).toBe("TV & Mounting (65-)")
  })
  it("removes path separators and reserved characters", () => {
    expect(sanitizeName("Oakwood / Unit 7")).toBe("Oakwood - Unit 7")
    expect(sanitizeName("a\\b:c*d?e<f>g|h")).toBe("a-b-c-d-e-f-g-h")
    // a single, harmless name: no separators survive
    expect(sanitizeName("../../etc/passwd")).toBe("-..-etc-passwd")
    expect(sanitizeName("../../etc/passwd")).not.toContain("/")
  })
  it("strips control characters, trailing dots/spaces and leading dots", () => {
    expect(sanitizeName("Name\u0000\n\t ok")).toBe("Name ok")
    expect(sanitizeName("Trailing... ")).toBe("Trailing")
    expect(sanitizeName("...hidden")).toBe("hidden")
  })
  it("falls back for empty or dot names and caps the length", () => {
    expect(sanitizeName("   ")).toBe("Untitled")
    expect(sanitizeName("..", "Customer")).toBe("Customer")
    expect(sanitizeName("x".repeat(200))).toHaveLength(80)
  })
})

describe("photo paths", () => {
  const at = new Date("2026-09-29T18:32:00Z") // 14:32 in New York
  it("builds the browsable layout", () => {
    expect(
      photoPath({
        customerName: "Oakwood Property Mgmt",
        jobTitle: "Unit 12 turnover repairs",
        stage: "DURING",
        at,
        timeZone: "America/New_York",
        shortId: "cmab12cdXYZ",
        mimeType: "image/jpeg",
      })
    ).toBe(
      "JobDesk/Customers/Oakwood Property Mgmt/Unit 12 turnover repairs/During/2026-09-29_1432_cmab12cd.jpg"
    )
  })
  it("uses General when there is no job, and the right extension", () => {
    expect(photoFolder({ customerName: "Sarah Mitchell", stage: "BEFORE" })).toBe(
      "JobDesk/Customers/Sarah Mitchell/General/Before"
    )
    expect(photoFileName({ at, timeZone: "UTC", shortId: "p1", mimeType: "image/png" })).toBe(
      "2026-09-29_1832_p1.png"
    )
  })
  it("relocates a file on rename or stage change and keeps its name", () => {
    const old = "JobDesk/Customers/Sarah Mitchell/General/Before/2026-09-29_1432_ab.jpg"
    expect(
      relocatedPath(old, {
        customerName: "Sarah M. Jones",
        jobTitle: "Hallway / paint",
        stage: "AFTER",
      })
    ).toBe("JobDesk/Customers/Sarah M. Jones/Hallway - paint/After/2026-09-29_1432_ab.jpg")
  })
})
