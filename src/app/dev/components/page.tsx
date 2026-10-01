import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  ChevronDown,
  Clock,
  FileText,
  Filter,
  KeyRound,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Search,
  User,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CalendarCard } from "@/components/shared/calendar-card"
import { CopyButton } from "@/components/shared/copy-button"
import { DetailRow, RowAction } from "@/components/shared/detail-row"
import { EmptyState, ErrorState } from "@/components/shared/empty-state"
import { InboxCard } from "@/components/shared/inbox-card"
import { JobCard } from "@/components/shared/job-card"
import { KpiCard } from "@/components/shared/kpi-card"
import { ProfileCard } from "@/components/shared/profile-card"
import { RoundButton } from "@/components/shared/round-button"
import {
  PaymentPill,
  QuoteStatusPill,
  StagePill,
  StatusPill,
} from "@/components/shared/status-pill"
import { DevToastButton } from "./toast-button"
import { JOB_STAGES } from "@/lib/status"

export const metadata: Metadata = { title: "Components" }

const TEAM = {
  JR: { name: "Jordan Reyes", color: "#D09A36" },
  AL: { name: "Alex Lin", color: "#3F8F93" },
}

const menu = (
  <button
    type="button"
    aria-label="More options"
    className="-mr-1 inline-flex size-7 items-center justify-center rounded-full text-text-muted hover:bg-black/5"
  >
    <MoreVertical className="size-4" />
  </button>
)

/**
 * Every shared component with sample props, laid out like docs/screens/shot-profile.png so
 * the two can be compared side by side. Development only.
 */
export default function DevComponentsPage() {
  if (process.env.NODE_ENV === "production" && process.env.SHOW_DEV_PAGES !== "1") notFound()

  return (
    <main className="mx-auto max-w-[1440px] px-4 pt-6 pb-16 md:pr-6 md:pl-[102px]">
      {/* Breadcrumb stand-in (the real one arrives with the shell in phase 3) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 md:-ml-[78px]">
        <h1 className="flex items-center gap-3 text-[22px] font-semibold text-text">
          <span aria-hidden className="text-[20px]">
            ←
          </span>{" "}
          Sarah Mitchell
        </h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-semibold">
            <span className="size-1.5 rounded-full bg-peach-bar" /> All jobs
          </span>
          <span className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-semibold">
            September 2026
          </span>
        </div>
      </div>

      {/* Row 1: ProfileCard + JobCard strip */}
      <div className="grid gap-[18px] lg:grid-cols-[380px_minmax(0,1fr)]">
        <ProfileCard
          name="Sarah Mitchell"
          subtitle="Homeowner"
          avatarColor="#C9825B"
          menu={menu}
          actions={[
            { label: "Message", icon: <MessageSquare />, href: "sms:5552148890" },
            { label: "Call", icon: <Phone />, href: "tel:5552148890" },
            {
              label: "Directions",
              icon: <MapPin />,
              href: "https://maps.google.com/?q=142+Maple+Ave",
            },
            { label: "Email", icon: <Mail />, href: "mailto:sarah.mitchell@email.com" },
          ]}
          sinceLabel="Customer since"
          sinceValue="Aug 2026"
          status={{ label: "Active", tone: "mint", check: true }}
        />

        <div className="min-w-0">
          <div className="mb-[14px] flex items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex h-[34px] items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-ink-foreground"
            >
              Sarah&apos;s jobs <ChevronDown className="size-4" />
            </button>
            <div className="flex gap-2">
              <RoundButton label="Search jobs" white size="sm">
                <Search />
              </RoundButton>
              <RoundButton label="Filter" white size="sm">
                <Filter />
              </RoundButton>
              <RoundButton label="Add job" white size="sm">
                <Plus />
              </RoundButton>
            </div>
          </div>
          <div className="scroll-strip">
            <JobCard
              dateLabel="Oct 2, 2026"
              title="Hallway drywall"
              category="Drywall & Paint"
              stage="SCHEDULED"
              assignees={[TEAM.JR, TEAM.AL]}
              chip="3 days left"
              menu={menu}
            />
            <JobCard
              dateLabel="Sep 5, 2026"
              title="Living room TV"
              category="TV & Mounting"
              stage="COMPLETED"
              assignees={[TEAM.JR]}
              chip="Done"
              menu={menu}
            />
            <JobCard
              dateLabel="Oct 14, 2026"
              title="Kitchen lights"
              category="Electrical"
              stage="QUOTED"
              assignees={[TEAM.AL]}
              chip="Awaiting reply"
              menu={menu}
            />
          </div>
        </div>
      </div>

      {/* Row 2: details, schedule, notes */}
      <div className="mt-[18px] grid gap-[18px] lg:grid-cols-[380px_minmax(0,1fr)_minmax(0,1.04fr)]">
        <section className="min-w-0 rounded-card bg-surface p-5">
          <header className="mb-1 flex min-h-8 items-center justify-between">
            <h2 className="text-[16px] font-semibold">Customer details</h2>
            <RowAction label="Edit details">
              <Pencil />
            </RowAction>
          </header>
          <DetailRow
            icon={<User />}
            label="Full name"
            value="Sarah Mitchell"
            pill={<StatusPill tone="mint">Active</StatusPill>}
            action={<CopyButton value="Sarah Mitchell" />}
          />
          <DetailRow
            icon={<Mail />}
            label="Email address"
            value="sarah.mitchell@email.com"
            action={<CopyButton value="sarah.mitchell@email.com" />}
          />
          <DetailRow
            icon={<Phone />}
            label="Contact number"
            value="(555) 214-8890"
            action={
              <RowAction label="Call" href="tel:5552148890">
                <Phone />
              </RowAction>
            }
          />
          <DetailRow
            icon={<MapPin />}
            label="Job site address"
            value="142 Maple Ave"
            action={
              <RowAction label="Open in maps" href="https://maps.google.com/?q=142+Maple+Ave">
                <MapPin />
              </RowAction>
            }
          />
          <DetailRow
            icon={<KeyRound />}
            label="Access notes"
            value="Friendly dog on site, side gate"
            action={
              <RowAction label="Edit access notes">
                <Pencil />
              </RowAction>
            }
          />
          <DetailRow
            icon={<Clock />}
            label="Preferred contact"
            value="Texts, after 5 pm"
            action={
              <RowAction label="Edit preferred contact">
                <Pencil />
              </RowAction>
            }
          />
        </section>

        <CalendarCard
          title="Job schedule"
          today="2026-09-29"
          initialMonth="2026-10"
          selectedDay="2026-10-23"
          menu={menu}
          events={[
            { day: "2026-10-02", tone: "sky", label: "Hallway drywall" },
            { day: "2026-10-09", tone: "neutral", label: "Lead visit" },
            { day: "2026-10-14", tone: "blush", label: "Kitchen lights" },
          ]}
          footer={
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] bg-surface-muted px-4 py-3">
              <div>
                <p className="field-label">Next visit</p>
                <p className="text-[14px] font-semibold">Fri, Oct 2 at 9:00 am</p>
              </div>
              <StatusPill tone="sky">Hallway drywall</StatusPill>
            </div>
          }
        />

        <InboxCard
          title="Notes and messages"
          viewAllHref="#"
          items={[
            {
              id: "1",
              avatarName: "Sarah Mitchell",
              avatarColor: "#C9825B",
              title: "Sarah Mitchell",
              preview: "Can you also look at the kitchen lights while you are here?",
              time: "Sat",
            },
            {
              id: "2",
              avatarName: "Me",
              avatarColor: "#2D3436",
              title: "Quote Q-1006 sent",
              preview: "Kitchen light fixtures, 3 items",
              time: "Sat",
              highlighted: true,
            },
            {
              id: "3",
              avatarName: "Jordan Reyes",
              avatarColor: "#D09A36",
              title: "Job note",
              preview: "Bring 2 sheets of drywall and primer on Friday",
              time: "Fri",
            },
            {
              id: "4",
              avatarName: "Me",
              avatarColor: "#2D3436",
              title: "Payment received",
              preview: "$338.04 for Q-1001, paid in full",
              time: "Sep 7",
            },
          ]}
        />
      </div>

      {/* Bottom strip: route tabs + summary */}
      <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Customer sections"
          className="scroll-strip max-w-full !gap-1 rounded-full bg-surface p-1"
        >
          {[
            ["Jobs", 3],
            ["Job site photos", 4],
            ["Quotes", 2],
            ["Payments", 1],
          ].map(([label, count], i) => (
            <span
              key={label}
              className={
                i === 0
                  ? "inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold whitespace-nowrap text-ink-foreground"
                  : "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium whitespace-nowrap text-text"
              }
            >
              {label} <span className="text-[11px] opacity-60">{count}</span>
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="white" size="md" className="text-text">
            Accepted work $338.04
          </StatusPill>
          <StatusPill tone="white" size="md" className="text-text">
            Paid $338.04
          </StatusPill>
          <StatusPill tone="mint" size="md">
            Balance $0.00
          </StatusPill>
        </div>
      </div>

      {/* ---------------- Component catalogue ---------------- */}
      <h2 className="mt-14 mb-4 text-[18px] font-semibold">Component catalogue</h2>

      <div className="grid gap-[18px] lg:grid-cols-2">
        <section className="rounded-card bg-surface p-5">
          <h3 className="card-title mb-3">Status pills</h3>
          <div className="flex flex-wrap gap-2">
            {JOB_STAGES.map((s) => (
              <StagePill key={s} stage={s} />
            ))}
            <StagePill stage="IN_PROGRESS" overdue />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <QuoteStatusPill status="DRAFT" />
            <QuoteStatusPill status="SENT" />
            <QuoteStatusPill status="ACCEPTED" />
            <QuoteStatusPill status="DECLINED" />
            <PaymentPill status="PAID" />
            <PaymentPill status="PART_PAID" />
            <PaymentPill status="UNPAID" />
            <PaymentPill status="NONE" />
          </div>
        </section>

        <section className="rounded-card bg-surface p-5">
          <h3 className="card-title mb-3">Buttons, inputs and toast</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button>
              <Plus /> Customer
            </Button>
            <Button variant="secondary">
              <FileText /> Preview
            </Button>
            <Button variant="muted">Custom line</Button>
            <Button variant="destructive">Delete</Button>
            <Button disabled>Disabled</Button>
            <DevToastButton />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Input placeholder="Search services and supplies" aria-label="Search" />
            <Input placeholder="$ type price" aria-label="Price" aria-invalid />
          </div>
        </section>
      </div>

      <div className="mt-[18px] grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue" value="$938.04" caption="3 payments" tone="mint" />
        <KpiCard label="Expenses" value="$661.50" caption="6 entries" tone="blush" />
        <KpiCard label="Net profit" value="$276.54" caption="September 2026" />
        <KpiCard
          label="Profit margin"
          value="29%"
          caption="Net profit as a share of revenue"
          tone="sky"
        />
      </div>

      <div className="mt-[18px] grid gap-[18px] lg:grid-cols-3">
        <JobCard
          dateLabel="Sep 29, 2026"
          title="Bedroom TV mount"
          category="TV & Mounting"
          stage="IN_PROGRESS"
          assignees={[{ name: "David Chen", color: "#4F7FBF" }, TEAM.JR]}
          chip="Today"
        />
        <JobCard
          dateLabel="Sep 27, 2026"
          title="Unit 12 turnover"
          category="Repairs"
          stage="IN_PROGRESS"
          overdue
          assignees={[{ name: "Owner", color: "#2D3436" }, TEAM.JR, TEAM.AL]}
          chip="2 days late"
        />
        <JobCard
          dateLabel="Oct 1, 2026"
          title="Kitchen faucet"
          category="Plumbing"
          stage="LEAD"
          assignees={[]}
          chip="New lead"
        />
      </div>

      <div className="mt-[18px] grid gap-[18px] lg:grid-cols-2">
        <section className="rounded-card bg-surface">
          <EmptyState
            icon={<Users />}
            title="No customers yet"
            description="Add your first customer to start tracking jobs."
            action={
              <Button>
                <Plus /> Customer
              </Button>
            }
          />
        </section>
        <div className="flex flex-col justify-center">
          <ErrorState
            title="Couldn't load this customer"
            description="Check your connection and try again."
            action={<Button variant="secondary">Try again</Button>}
          />
        </div>
      </div>
    </main>
  )
}
