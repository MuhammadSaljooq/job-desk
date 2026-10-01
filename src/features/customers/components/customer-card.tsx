import Link from "next/link"
import { Camera, MapPin, MessageSquare, Phone } from "lucide-react"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import { RoundButton } from "@/components/shared/round-button"
import { StagePill } from "@/components/shared/status-pill"
import { formatMoney } from "@/lib/money"
import type { CustomerCardData } from "../queries"
import { CustomerCardMenu } from "./customer-card-menu"
import { contactLinks } from "../contact"

/** One card per customer (shot-customers.png). The name is a stretched link to the profile. */
export function CustomerCard({
  customer,
  canDelete,
  currency,
}: {
  customer: CustomerCardData
  canDelete: boolean
  currency: string
}) {
  const links = contactLinks(customer)
  const j = customer.latestJob
  return (
    <article className="relative flex min-w-0 flex-col rounded-card bg-surface p-5 transition-shadow focus-within:ring-2 focus-within:ring-ink hover:shadow-[0_2px_12px_rgb(0_0_0/0.05)]">
      <div className="flex items-start gap-3.5">
        <InitialsAvatar name={customer.name} size="lg" />
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="truncate text-[17px] leading-tight font-bold text-text">
            <Link
              href={`/customers/${customer.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-card after:content-['']"
            >
              {customer.name}
            </Link>
          </h2>
          <p className="mt-1 flex items-center gap-1 truncate text-[12.5px] text-text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{customer.address ?? "No address yet"}</span>
          </p>
        </div>
        <div className="relative z-10 -mr-1">
          <CustomerCardMenu customerId={customer.id} name={customer.name} canDelete={canDelete} />
        </div>
      </div>

      <div className="mt-4 rounded-[16px] bg-surface-muted px-4 py-3">
        <p className="field-label">Latest job</p>
        {j ? (
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[14px] font-semibold text-text">{j.title}</p>
            <StagePill stage={j.stage} overdue={j.overdue} />
          </div>
        ) : (
          <p className="mt-1 text-[14px] text-text-subtle">No jobs yet</p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative z-10 flex gap-2">
          <RoundButton label={`Call ${customer.name}`} href={links.tel} disabled={!links.tel}>
            <Phone />
          </RoundButton>
          <RoundButton label={`Text ${customer.name}`} href={links.sms} disabled={!links.sms}>
            <MessageSquare />
          </RoundButton>
          <RoundButton
            label={`Directions to ${customer.name}`}
            href={links.maps}
            disabled={!links.maps}
          >
            <MapPin />
          </RoundButton>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {customer.balance > 0 && (
            <span className="inline-flex h-8 items-center rounded-full bg-blush px-3 text-[12px] font-semibold text-blush-ink">
              Owes {formatMoney(customer.balance, currency)}
            </span>
          )}
          <span className="inline-flex h-8 items-center rounded-full bg-surface-muted px-3 text-[12.5px] font-semibold text-text">
            {customer.jobCount} {customer.jobCount === 1 ? "job" : "jobs"}
          </span>
          <span
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-muted px-3 text-[12.5px] font-semibold text-text"
            aria-label={`${customer.photoCount} photos`}
          >
            <Camera className="size-3.5" aria-hidden /> {customer.photoCount}
          </span>
        </div>
      </div>
    </article>
  )
}
