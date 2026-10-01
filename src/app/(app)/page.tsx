import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "Home" }

function greeting(timeZone: string, now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now)
  )
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

export default async function DashboardPage() {
  const user = await requireUser()
  const business = await db.business.findUniqueOrThrow({
    where: { id: user.businessId },
    select: { name: true },
  })
  return (
    <>
      <Breadcrumb title={`${greeting(user.timezone)}, ${business.name}`} />
      <ComingSoon phase={9} what="The dashboard" />
    </>
  )
}
