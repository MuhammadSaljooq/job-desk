import type { Metadata } from "next"
import { Suspense } from "react"
import { SearchX, Users } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { EmptyState } from "@/components/shared/empty-state"
import { CustomerCard } from "@/features/customers/components/customer-card"
import { CustomersPageClient } from "@/features/customers/components/customers-page-client"
import { NewCustomerButton } from "@/features/customers/components/new-customer-button"
import { listCustomerOptions, listCustomers, listTeam } from "@/features/customers/queries"
import { CUSTOMER_FILTERS, type CustomerFilter } from "@/features/customers/schema"

export const metadata: Metadata = { title: "Customers" }

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const user = await requireUser()
  const sp = await searchParams
  const q = typeof sp.q === "string" ? sp.q : ""
  const filter = (CUSTOMER_FILTERS as readonly string[]).includes(String(sp.filter))
    ? (sp.filter as CustomerFilter)
    : "all"

  const [customers, team, options] = await Promise.all([
    listCustomers(user.businessId, { q, filter, timezone: user.timezone }),
    listTeam(user.businessId),
    listCustomerOptions(user.businessId),
  ])

  return (
    <>
      <Suspense>
        <CustomersPageClient team={team} customers={options} />
      </Suspense>
      {customers.length === 0 ? (
        <section className="rounded-card bg-surface">
          {q || filter !== "all" ? (
            <EmptyState
              icon={<SearchX />}
              title="No customers match"
              description={
                q
                  ? `Nothing for “${q}”. Try a name, phone number or street.`
                  : "Try another filter."
              }
            />
          ) : (
            <EmptyState
              icon={<Users />}
              title="No customers yet"
              description="Add your first customer to start tracking jobs."
              action={<NewCustomerButton />}
            />
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              canDelete={user.role === "OWNER"}
              currency={user.currency}
            />
          ))}
        </div>
      )}
    </>
  )
}
