import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "Calendar" }

export default async function Page() {
  await requireUser()
  return (
    <>
      <Breadcrumb title="Calendar" backHref="/" />
      <ComingSoon phase={9} what="The calendar" />
    </>
  )
}
