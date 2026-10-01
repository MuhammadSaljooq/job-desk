import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { Plus } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { CustomerSubpage } from "@/features/customers/components/customer-subpage"
import { listQuotes } from "@/features/quotes/queries"
import { QuotesTable } from "@/features/quotes/components/quotes-table"

export const metadata: Metadata = { title: "Quotes" }

export default async function CustomerQuotesPage({
  params,
  searchParams,
}: PageProps<"/customers/[id]/quotes">) {
  const user = await requireUser()
  const { id } = await params
  const sp = await searchParams
  const { rows } = await listQuotes(user.businessId, {
    month: null,
    customerId: id,
    q: typeof sp.q === "string" ? sp.q : undefined,
  })
  return (
    <CustomerSubpage
      customerId={id}
      title="Quotes"
      actions={
        <Button asChild>
          <Link href={`/quotes/new?customer=${id}`}>
            <Plus /> New quote
          </Link>
        </Button>
      }
    >
      <Suspense>
        <QuotesTable
          rows={rows}
          currency={user.currency}
          title="This customer's quotes"
          showCustomer={false}
          newHref={`/quotes/new?customer=${id}`}
        />
      </Suspense>
    </CustomerSubpage>
  )
}
