import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "Photos" }

export default async function Page() {
  await requireUser()
  return (
    <>
      <Breadcrumb title="Photos" backHref="/" />
      <ComingSoon phase={5} what="The all-photos gallery" />
    </>
  )
}
