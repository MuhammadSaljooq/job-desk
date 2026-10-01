import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "Customer" }

export default async function Page() {
  await requireUser()
  return (
    <>
      <Breadcrumb title="Customer" backHref="/customers" />
      <ComingSoon phase={4} what="The customer profile" />
    </>
  )
}
