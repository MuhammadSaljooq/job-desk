import "server-only"
import { db } from "@/lib/db"
import { customerBalances } from "@/features/quotes/sql"
import { dayInZone } from "@/lib/dates"
import { isOverdue, type JobStage } from "@/lib/status"
import type { CustomerFilter } from "./schema"

export type JobSummary = {
  id: string
  title: string
  category: string | null
  stage: JobStage
  scheduledAt: Date | null
  overdue: boolean
}

export type CustomerCardData = {
  id: string
  name: string
  type: "HOMEOWNER" | "LANDLORD" | "BUSINESS"
  address: string | null
  phone: string | null
  email: string | null
  jobCount: number
  activeJobCount: number
  photoCount: number
  balance: number
  latestJob: JobSummary | null
}

/**
 * The job to show on a customer card: the next active job by date (an overdue one first),
 * otherwise the most recently finished one.
 */
export function pickLatestJob(jobs: JobSummary[]): JobSummary | null {
  const active = jobs.filter((j) => j.stage !== "COMPLETED")
  if (active.length) {
    return [...active].sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
      const ta = a.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER
      const tb = b.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER
      return ta - tb
    })[0]
  }
  return (
    [...jobs].sort(
      (a, b) => (b.scheduledAt?.getTime() ?? 0) - (a.scheduledAt?.getTime() ?? 0)
    )[0] ?? null
  )
}

export async function listCustomers(
  businessId: string,
  opts: { q?: string; filter?: CustomerFilter; timezone: string; now?: Date }
): Promise<CustomerCardData[]> {
  const q = opts.q?.trim().slice(0, 80)
  const contains = q ? { contains: q, mode: "insensitive" as const } : undefined
  const digits = q?.replace(/\D/g, "") ?? ""
  const today = dayInZone(opts.now ?? new Date(), opts.timezone)

  const customers = await db.customer.findMany({
    where: {
      businessId,
      ...(contains
        ? {
            OR: [
              { name: contains },
              { address: contains },
              { email: contains },
              { phone: contains },
              ...(digits.length >= 3 ? [{ phone: { contains: digits.slice(-4) } }] : []),
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
      address: true,
      phone: true,
      email: true,
      _count: { select: { jobs: true, photos: true } },
      jobs: {
        select: { id: true, title: true, category: true, stage: true, scheduledAt: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const balances = await customerBalances(businessId)

  const cards = customers
    .filter((c) => {
      // "(555) 214-8890" should match "2148890" but "1234" shouldn't match every 4 digits.
      if (!q || digits.length < 3) return true
      const textHit = [c.name, c.address, c.email].some((v) =>
        (v ?? "").toLowerCase().includes(q.toLowerCase())
      )
      return textHit || (c.phone ?? "").replace(/\D/g, "").includes(digits)
    })
    .map((c): CustomerCardData => {
      const jobs: JobSummary[] = c.jobs.map((j) => ({
        ...j,
        overdue: isOverdue(
          j.stage,
          j.scheduledAt ? dayInZone(j.scheduledAt, opts.timezone) : null,
          today
        ),
      }))
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        address: c.address,
        phone: c.phone,
        email: c.email,
        jobCount: c._count.jobs,
        activeJobCount: jobs.filter((j) => j.stage !== "COMPLETED").length,
        photoCount: c._count.photos,
        balance: balances.get(c.id)?.balance ?? 0,
        latestJob: pickLatestJob(jobs),
      }
    })

  switch (opts.filter) {
    case "active":
      return cards.filter((c) => c.activeJobCount > 0)
    case "none":
      return cards.filter((c) => c.jobCount === 0)
    case "owes":
      return cards.filter((c) => c.balance > 0)
    default:
      return cards
  }
}

/** Everything the profile page needs, or null when the id isn't in this business. */
export async function getCustomerProfile(businessId: string, customerId: string) {
  const customer = await db.customer.findFirst({
    where: { id: customerId, businessId },
    include: {
      jobs: {
        include: {
          assignees: { select: { id: true, name: true, avatarColor: true } },
          _count: { select: { photos: true } },
        },
        orderBy: [{ scheduledAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      },
      _count: { select: { photos: true, quotes: true } },
    },
  })
  if (!customer) return null

  const [balances, paid, payments] = await Promise.all([
    customerBalances(businessId, customerId),
    db.transaction.aggregate({
      where: { businessId, customerId, type: "INCOME" },
      _sum: { amountCents: true },
    }),
    db.transaction.count({ where: { businessId, customerId, type: "INCOME" } }),
  ])
  const b = balances.get(customerId) ?? { accepted: 0, paidOnQuotes: 0, balance: 0 }
  return {
    customer,
    summary: {
      jobs: customer.jobs.length,
      photos: customer._count.photos,
      quotes: customer._count.quotes,
      payments,
      accepted: b.accepted,
      paid: paid._sum.amountCents ?? 0,
      balance: b.balance,
    },
  }
}

export type CustomerProfile = NonNullable<Awaited<ReturnType<typeof getCustomerProfile>>>

/** Team members for assignee pickers. */
export function listTeam(businessId: string) {
  return db.user.findMany({
    where: { businessId },
    select: { id: true, name: true, avatarColor: true, role: true, title: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })
}

/** Customer names for pickers (job dialog from the + New menu, quotes). */
export function listCustomerOptions(businessId: string) {
  return db.customer.findMany({
    where: { businessId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}
