import { describe, expect, it } from "vitest"
import { STAGE_META, isOverdue, jobTone } from "@/lib/status"
import { dayInZone, daysBetween, jobChipLabel, shiftDay } from "@/lib/dates"
import { colorForName, initials, AVATAR_PALETTE } from "@/lib/avatar"
import { monthGrid } from "@/components/shared/calendar-card"

describe("stage progress (phase 4 spec)", () => {
  it("maps each stage to its percentage", () => {
    expect(STAGE_META.LEAD.progress).toBe(10)
    expect(STAGE_META.QUOTED.progress).toBe(30)
    expect(STAGE_META.SCHEDULED.progress).toBe(50)
    expect(STAGE_META.IN_PROGRESS.progress).toBe(75)
    expect(STAGE_META.COMPLETED.progress).toBe(100)
  })
})

describe("isOverdue (decision D10)", () => {
  const today = "2026-09-29"
  it("is overdue only for scheduled / in-progress jobs dated before today", () => {
    expect(isOverdue("SCHEDULED", "2026-09-28", today)).toBe(true)
    expect(isOverdue("IN_PROGRESS", "2026-09-27", today)).toBe(true)
  })
  it("is not overdue on the day itself or later", () => {
    expect(isOverdue("SCHEDULED", today, today)).toBe(false)
    expect(isOverdue("SCHEDULED", "2026-10-02", today)).toBe(false)
  })
  it("never flags leads, quoted or completed jobs, or undated jobs", () => {
    expect(isOverdue("LEAD", "2026-01-01", today)).toBe(false)
    expect(isOverdue("QUOTED", "2026-01-01", today)).toBe(false)
    expect(isOverdue("COMPLETED", "2026-01-01", today)).toBe(false)
    expect(isOverdue("SCHEDULED", null, today)).toBe(false)
  })
  it("draws overdue jobs blush, otherwise the stage tone", () => {
    expect(jobTone("IN_PROGRESS", true)).toBe("blush")
    expect(jobTone("IN_PROGRESS", false)).toBe("peach")
    expect(jobTone("SCHEDULED", false)).toBe("sky")
    expect(jobTone("COMPLETED", false)).toBe("mint")
  })
})

describe("dates", () => {
  it("converts an instant to the business-local day", () => {
    // 02:30 UTC on Sep 30 is still Sep 29 in New York (UTC-4)
    const instant = new Date("2026-09-30T02:30:00Z")
    expect(dayInZone(instant, "America/New_York")).toBe("2026-09-29")
    expect(dayInZone(instant, "UTC")).toBe("2026-09-30")
  })
  it("shifts and diffs days across month boundaries", () => {
    expect(shiftDay("2026-09-29", 3)).toBe("2026-10-02")
    expect(daysBetween("2026-09-29", "2026-10-02")).toBe(3)
    expect(daysBetween("2026-09-29", "2026-09-27")).toBe(-2)
  })
  it("labels the job card chip like the screenshots", () => {
    const today = "2026-09-29"
    expect(jobChipLabel("SCHEDULED", "2026-10-02", today)).toBe("3 days left")
    expect(jobChipLabel("IN_PROGRESS", today, today)).toBe("Today")
    expect(jobChipLabel("SCHEDULED", "2026-09-30", today)).toBe("Tomorrow")
    expect(jobChipLabel("IN_PROGRESS", "2026-09-27", today)).toBe("2 days late")
    expect(jobChipLabel("IN_PROGRESS", "2026-09-28", today)).toBe("1 day late")
    expect(jobChipLabel("COMPLETED", "2026-09-05", today)).toBe("Done")
    expect(jobChipLabel("QUOTED", "2026-10-14", today)).toBe("Awaiting reply")
    expect(jobChipLabel("SCHEDULED", null, today)).toBe("Not scheduled")
  })
})

describe("avatar", () => {
  it("builds initials from one or more words", () => {
    expect(initials("Sarah Mitchell")).toBe("SM")
    expect(initials("Oakwood Property Mgmt")).toBe("OP")
    expect(initials("alvarez")).toBe("AL")
    expect(initials("  ")).toBe("?")
  })
  it("gives a stable palette colour per name, never the owner's ink", () => {
    expect(colorForName("Sarah Mitchell")).toBe(colorForName("sarah mitchell "))
    const ink = AVATAR_PALETTE[AVATAR_PALETTE.length - 1]
    for (const n of ["A", "Bob", "Priya Patel", "Marcus Johnson", "Zed"]) {
      expect(AVATAR_PALETTE).toContain(colorForName(n))
      expect(colorForName(n)).not.toBe(ink)
    }
  })
})

describe("calendar month grid", () => {
  it("starts on Monday with leading blanks", () => {
    // October 2026 starts on a Thursday: Mon, Tue, Wed are blank
    const cells = monthGrid("2026-10")
    expect(cells.slice(0, 4)).toEqual([null, null, null, "2026-10-01"])
    expect(cells.filter(Boolean)).toHaveLength(31)
  })
  it("has no blanks when the month starts on Monday", () => {
    // June 2026 starts on a Monday
    expect(monthGrid("2026-06")[0]).toBe("2026-06-01")
  })
})

import { zonedInstant, timeInZone, dayToDbDate, dbDateToDay } from "@/lib/dates"

describe("zoned instants", () => {
  it("converts local wall-clock time to UTC (EDT and EST)", () => {
    expect(zonedInstant("2026-10-02", "09:00", "America/New_York").toISOString()).toBe(
      "2026-10-02T13:00:00.000Z"
    )
    expect(zonedInstant("2026-12-15", "09:00", "America/New_York").toISOString()).toBe(
      "2026-12-15T14:00:00.000Z"
    )
    expect(zonedInstant("2026-10-02", "09:00", "UTC").toISOString()).toBe(
      "2026-10-02T09:00:00.000Z"
    )
  })
  it("round-trips through timeInZone and dayInZone", () => {
    const i = zonedInstant("2026-11-01", "23:30", "America/Los_Angeles")
    expect(timeInZone(i, "America/Los_Angeles")).toBe("23:30")
    expect(dayInZone(i, "America/Los_Angeles")).toBe("2026-11-01")
  })
  it("stores DATE columns as UTC midnight of the local day", () => {
    expect(dayToDbDate("2026-09-29").toISOString()).toBe("2026-09-29T00:00:00.000Z")
    expect(dbDateToDay(dayToDbDate("2026-09-29"))).toBe("2026-09-29")
  })
})
