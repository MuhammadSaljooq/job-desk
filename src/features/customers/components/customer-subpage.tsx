import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { formatMoney } from "@/lib/money"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { StatusPill } from "@/components/shared/status-pill"
import { loadProfile } from "../profile-view"
import { CustomerTabs } from "./customer-tabs"

/** Header for the Quotes / Payments / Photos tabs: breadcrumb, tabs and money summary. */
export async function CustomerSubpage({
  customerId,
  title,
  actions,
  children,
}: {
  customerId: string
  title: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const user = await requireUser()
  const profile = await loadProfile(user.businessId, customerId)
  if (!profile) notFound()
  const { customer: c, summary } = profile
  return (
    <>
      <Breadcrumb title={`${c.name}: ${title}`} backHref={`/customers/${c.id}`}>
        {actions}
      </Breadcrumb>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <CustomerTabs
          customerId={c.id}
          counts={{
            jobs: summary.jobs,
            photos: summary.photos,
            quotes: summary.quotes,
            payments: summary.payments,
          }}
        />
        <div className="flex flex-wrap gap-2" aria-label="Money summary">
          <StatusPill tone="white" size="md" className="text-text">
            Accepted work {formatMoney(summary.accepted, user.currency)}
          </StatusPill>
          <StatusPill tone="white" size="md" className="text-text">
            Paid {formatMoney(summary.paid, user.currency)}
          </StatusPill>
          <StatusPill tone={summary.balance > 0 ? "blush" : "mint"} size="md">
            Balance {formatMoney(summary.balance, user.currency)}
          </StatusPill>
        </div>
      </div>
      {children}
    </>
  )
}
