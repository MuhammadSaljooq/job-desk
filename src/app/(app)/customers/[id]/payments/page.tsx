import type { Metadata } from "next"
import { Plus } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { dayInZone } from "@/lib/dates"
import { CustomerSubpage } from "@/features/customers/components/customer-subpage"
import { listTransactions, transactionLinkOptions } from "@/features/books/queries"
import { blankEntry } from "@/features/books/entry"
import { NewEntryButton } from "@/features/books/components/entry-buttons"
import { TransactionsCard } from "@/features/books/components/transactions-card"

export const metadata: Metadata = { title: "Payments" }

/** Profile > Payments tab: this customer's income, all time, read from the ledger. */
export default async function Page({ params }: PageProps<"/customers/[id]/payments">) {
  const user = await requireUser()
  const { id } = await params
  const today = dayInZone(new Date(), user.timezone)
  const [rows, links] = await Promise.all([
    listTransactions(user.businessId, { month: null, type: "INCOME", customerId: id }),
    transactionLinkOptions(user.businessId),
  ])
  const initial = blankEntry("INCOME", today, id)
  return (
    <CustomerSubpage
      customerId={id}
      title="Payments"
      actions={
        <NewEntryButton initial={initial} links={links}>
          <Plus /> Record payment
        </NewEntryButton>
      }
    >
      <TransactionsCard
        rows={rows}
        month={null}
        type="INCOME"
        currency={user.currency}
        canDelete={user.role === "OWNER"}
        today={today}
        links={links}
        title="This customer's payments"
        showFilter={false}
        showCustomer={false}
        newEntry={initial}
      />
    </CustomerSubpage>
  )
}
