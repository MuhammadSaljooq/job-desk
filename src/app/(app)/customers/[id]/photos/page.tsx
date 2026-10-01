import type { Metadata } from "next"
import { ComingSoon } from "@/components/shared/coming-soon"
import { CustomerSubpage } from "@/features/customers/components/customer-subpage"

export const metadata: Metadata = { title: "Job site photos" }

export default async function Page({ params }: PageProps<"/customers/[id]/photos">) {
  const { id } = await params
  return (
    <CustomerSubpage customerId={id} title="Job site photos">
      <ComingSoon phase={5} what="Job site photos" />
    </CustomerSubpage>
  )
}
