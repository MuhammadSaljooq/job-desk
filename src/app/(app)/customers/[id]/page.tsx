import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Clock, KeyRound, Mail, MapPin, MessageSquare, Phone, User } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { dayInZone, formatMonthOf } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { parseMonthParam } from "@/lib/month"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { ProfileCard } from "@/components/shared/profile-card"
import { DetailRow, RowAction } from "@/components/shared/detail-row"
import { CopyButton } from "@/components/shared/copy-button"
import { StatusPill } from "@/components/shared/status-pill"
import { MonthPicker } from "@/components/shared/month-picker"
import { latestActivity } from "@/features/activity/queries"
import { contactLinks } from "@/features/customers/contact"
import { CUSTOMER_TYPE_LABEL } from "@/features/customers/schema"
import { loadProfile, profileJobsView, type JobsFilter } from "@/features/customers/profile-view"
import { ProfileCardMenu } from "@/features/customers/components/profile-card-menu"
import { JobsStrip } from "@/features/customers/components/jobs-strip"
import { ScheduleCard } from "@/features/customers/components/schedule-card"
import { NotesCard } from "@/features/customers/components/notes-card"
import { CustomerTabs } from "@/features/customers/components/customer-tabs"
import { JobsFilterPill } from "@/features/customers/components/jobs-filter-pill"
import { EditCustomerButton } from "@/features/customers/components/profile-dialogs"
import { JobsList } from "@/features/jobs/components/jobs-list"

export async function generateMetadata({
  params,
}: PageProps<"/customers/[id]">): Promise<Metadata> {
  const user = await requireUser()
  const { id } = await params
  const p = await loadProfile(user.businessId, id)
  return { title: p?.customer.name ?? "Customer" }
}

export default async function CustomerProfilePage({
  params,
  searchParams,
}: PageProps<"/customers/[id]">) {
  const user = await requireUser()
  const { id } = await params
  const sp = await searchParams
  const profile = await loadProfile(user.businessId, id)
  if (!profile) notFound()
  const { customer: c, summary } = profile

  const now = new Date()
  const thisMonth = dayInZone(now, user.timezone).slice(0, 7)
  const month = parseMonthParam(sp.month, thisMonth) ?? thisMonth
  const filter: JobsFilter = sp.jobs === "active" || sp.jobs === "completed" ? sp.jobs : "all"
  const view = profileJobsView(profile, { timezone: user.timezone, now, filter })
  const notes = await latestActivity(user.businessId, {
    customerId: c.id,
    take: 6,
    timezone: user.timezone,
    avatar: "actor",
  })
  const links = contactLinks(c)
  const firstName = c.type === "HOMEOWNER" ? c.name.split(" ")[0] : c.name
  const currency = user.currency

  return (
    <>
      <Breadcrumb title={c.name} backHref="/customers">
        <JobsFilterPill current={filter} />
        <MonthPicker current={month} defaultMonth={thisMonth} />
      </Breadcrumb>

      {/* Row 1: profile + jobs strip */}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[380px_minmax(0,1fr)]">
        <ProfileCard
          name={c.name}
          subtitle={CUSTOMER_TYPE_LABEL[c.type]}
          menu={
            <ProfileCardMenu customerId={c.id} name={c.name} canDelete={user.role === "OWNER"} />
          }
          actions={[
            { label: "Message", icon: <MessageSquare />, href: links.sms },
            { label: "Call", icon: <Phone />, href: links.tel },
            { label: "Directions", icon: <MapPin />, href: links.maps },
            { label: "Email", icon: <Mail />, href: links.mailto },
          ]}
          sinceLabel="Customer since"
          sinceValue={formatMonthOf(c.createdAt, user.timezone)}
          status={
            c.status === "ACTIVE"
              ? { label: "Active", tone: "mint", check: true }
              : { label: "Past customer", tone: "neutral" }
          }
        />
        <JobsStrip
          label={`${firstName}${firstName.endsWith("s") ? "'" : "'s"} jobs`}
          jobs={view.strip}
        />
      </div>

      {/* Row 2: details, schedule, notes */}
      <div className="mt-[18px] grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-[380px_minmax(0,1fr)_minmax(0,1.04fr)]">
        <section className="min-w-0 rounded-card bg-surface p-5" aria-labelledby="details-title">
          <header className="mb-1 flex min-h-8 items-center justify-between">
            <h2 id="details-title" className="text-[16px] font-semibold">
              Customer details
            </h2>
            <EditCustomerButton />
          </header>
          <DetailRow
            icon={<User />}
            label="Full name"
            value={c.name}
            pill={
              <StatusPill tone={c.status === "ACTIVE" ? "mint" : "neutral"}>
                {c.status === "ACTIVE" ? "Active" : "Past"}
              </StatusPill>
            }
            action={<CopyButton value={c.name} label="Copy name" />}
          />
          <DetailRow
            icon={<Mail />}
            label="Email address"
            value={c.email}
            action={
              c.email ? <CopyButton value={c.email} label="Copy email" /> : <EditCustomerButton />
            }
          />
          <DetailRow
            icon={<Phone />}
            label="Contact number"
            value={c.phone}
            action={
              links.tel ? (
                <RowAction label="Call" href={links.tel}>
                  <Phone />
                </RowAction>
              ) : (
                <EditCustomerButton />
              )
            }
          />
          <DetailRow
            icon={<MapPin />}
            label="Job site address"
            value={c.address}
            action={
              links.maps ? (
                <RowAction label="Open in maps" href={links.maps}>
                  <MapPin />
                </RowAction>
              ) : (
                <EditCustomerButton />
              )
            }
          />
          <DetailRow
            icon={<KeyRound />}
            label="Access notes"
            value={c.accessNotes}
            action={<EditCustomerButton />}
          />
          <DetailRow
            icon={<Clock />}
            label="Preferred contact"
            value={c.preferredContact}
            action={<EditCustomerButton />}
          />
        </section>

        <ScheduleCard
          today={view.today}
          month={month}
          events={view.events}
          jobsByDay={view.jobsByDay}
          nextVisit={view.nextVisit}
        />

        <div className="md:col-span-2 xl:col-span-1">
          <NotesCard customerId={c.id} items={notes.items} />
        </div>
      </div>

      {/* Tabs + summary strip */}
      <div className="mt-[18px] mb-[18px] flex flex-wrap items-center justify-between gap-3">
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
            Accepted work {formatMoney(summary.accepted, currency)}
          </StatusPill>
          <StatusPill tone="white" size="md" className="text-text">
            Paid {formatMoney(summary.paid, currency)}
          </StatusPill>
          <StatusPill tone={summary.balance > 0 ? "blush" : "mint"} size="md">
            Balance {formatMoney(summary.balance, currency)}
          </StatusPill>
        </div>
      </div>

      <JobsList jobs={view.rows} />
    </>
  )
}
