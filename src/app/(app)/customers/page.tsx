import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "Customers" }

export default async function Page() {
  await requireUser()
  return (
    <>
      <Breadcrumb title="Customers" backHref="/" />
      <ComingSoon phase={4} what="The customers list" />
    </>
  )
}
