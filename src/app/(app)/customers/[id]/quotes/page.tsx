import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "Customer quotes" }

export default async function Page() {
  await requireUser()
  return (
    <>
      <Breadcrumb title="Customer quotes" backHref="/customers" />
      <ComingSoon phase={7} what="Customer quotes" />
    </>
  )
}
