import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = { title: "Job site photos" }

export default async function Page() {
  await requireUser()
  return (
    <>
      <Breadcrumb title="Job site photos" backHref="/customers" />
      <ComingSoon phase={5} what="Job site photos" />
    </>
  )
}
