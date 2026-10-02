import { describe, expect, it } from "vitest"
import { customersCsv, jobsCsv } from "@/features/settings/export"

describe("settings CSV exports", () => {
  it("writes customers with labels, quoting and formula escaping", () => {
    const csv = customersCsv([
      {
        name: "Oakwood Property Mgmt",
        type: "LANDLORD",
        status: "ACTIVE",
        phone: "+1 555 0100",
        email: "office@oakwood.example",
        address: "12 Main St, Unit 7",
        notes: "=cmd",
        createdDay: "2026-05-01",
      },
    ])
    expect(csv.startsWith("﻿")).toBe(true)
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Name,Type,Status,Phone,Email,Address,Notes,Customer since",
      "Oakwood Property Mgmt,Landlord,Active,'+1 555 0100,office@oakwood.example,\"12 Main St, Unit 7\",'=cmd,2026-05-01",
      "",
    ])
  })

  it("writes jobs with the stage label, local time and crew", () => {
    const csv = jobsCsv([
      {
        title: "Bedroom TV mount",
        customer: "David Chen",
        category: "TV & Mounting",
        stage: "IN_PROGRESS",
        scheduled: "2026-10-01 09:00",
        assignees: ["Jordan Reyes", "Alex Lin"],
        notes: null,
      },
    ])
    expect(csv.split("\r\n")[1]).toBe(
      "Bedroom TV mount,David Chen,TV & Mounting,In progress,2026-10-01 09:00,Jordan Reyes; Alex Lin,"
    )
  })
})
