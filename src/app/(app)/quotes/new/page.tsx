import type { Metadata } from "next"
import { requireUser } from "@/lib/auth"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { listCustomerOptions } from "@/features/customers/queries"
import { NewQuoteForm } from "@/features/quotes/components/new-quote-form"

export const metadata: Metadata = { title: "New quote" }

/** Pick a customer (and optionally a job), then the draft is created and the builder opens. */
export default async function NewQuotePage({ searchParams }: PageProps<"/quotes/new">) {
  const user = await requireUser()
  const sp = await searchParams
  const customers = await listCustomerOptions(user.businessId)
  const preset =
    typeof sp.customer === "string" && customers.some((c) => c.id === sp.customer)
      ? sp.customer
      : null
  const job = typeof sp.job === "string" ? sp.job : null
  return (
    <>
      <Breadcrumb title="New quote" backHref="/quotes" />
      <NewQuoteForm customers={customers} presetCustomerId={preset} presetJobId={job} />
    </>
  )
}
