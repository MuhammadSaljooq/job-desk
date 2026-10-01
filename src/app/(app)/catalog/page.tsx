import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "Item catalog" }

export default async function Page() {
  await requireUser()
  return (
    <>
      <Breadcrumb title="Item catalog" backHref="/" />
      <ComingSoon phase={6} what="The item catalog" />
    </>
  )
}
