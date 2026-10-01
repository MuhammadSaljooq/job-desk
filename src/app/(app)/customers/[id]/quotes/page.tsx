import type { Metadata } from "next"
import { ComingSoon } from "@/components/shared/coming-soon"
import { CustomerSubpage } from "@/features/customers/components/customer-subpage"

export const metadata: Metadata = { title: "Quotes" }

export default async function Page({ params }: PageProps<"/customers/[id]/quotes">) {
  const { id } = await params
  return (
    <CustomerSubpage customerId={id} title="Quotes">
      <ComingSoon phase={7} what="This customer’s quotes" />
    </CustomerSubpage>
  )
}
