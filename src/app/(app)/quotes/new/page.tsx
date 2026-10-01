import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "New quote" }

export default async function Page() {
  await requireUser()
  return (
    <>
      <Breadcrumb title="New quote" backHref="/quotes" />
      <ComingSoon phase={7} what="The quote builder" />
    </>
  )
}
