import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "Fast quotes" }

export default async function Page() {
  await requireUser()
  return (
    <>
      <Breadcrumb title="Fast quotes" backHref="/" />
      <ComingSoon phase={7} what="The quotes list" />
    </>
  )
}
