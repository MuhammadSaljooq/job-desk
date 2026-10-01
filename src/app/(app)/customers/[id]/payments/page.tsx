import type { Metadata } from "next"
import { ComingSoon } from "@/components/shared/coming-soon"
import { CustomerSubpage } from "@/features/customers/components/customer-subpage"

export const metadata: Metadata = { title: "Payments" }

export default async function Page({ params }: PageProps<"/customers/[id]/payments">) {
  const { id } = await params
  return (
    <CustomerSubpage customerId={id} title="Payments">
      <ComingSoon phase={8} what="This customer’s payments" />
    </CustomerSubpage>
  )
}
