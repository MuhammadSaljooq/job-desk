import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "Bookkeeping" }

export default async function Page() {
  await requireUser()
  return (
    <>
      <Breadcrumb title="Bookkeeping" backHref="/" />
      <ComingSoon phase={8} what="Bookkeeping" />
    </>
  )
}
