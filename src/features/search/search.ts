import "server-only"
import { db } from "@/lib/db"

export type SearchHit = {
  kind: "customer" | "job" | "quote"
  id: string
  title: string
  subtitle: string
  href: string
}

/** Normalise "Q-1004", "q1004", "#1004" to 1004 for quote number search. */
export function parseQuoteNumber(q: string): number | null {
  const m = /^(?:q-?|#)?\s*(\d{3,7})$/i.exec(q.trim())
  return m ? Number(m[1]) : null
}

/** Customers, jobs and quotes matching the text, scoped to one business. */
export async function searchEverything(businessId: string, raw: string): Promise<SearchHit[]> {
  const q = raw.trim().slice(0, 80)
  if (q.length < 2) return []
  const contains = { contains: q, mode: "insensitive" as const }
  const digits = q.replace(/\D/g, "")

  const [customers, jobs, quotes] = await Promise.all([
    db.customer.findMany({
      where: {
        businessId,
        OR: [
          { name: contains },
          { address: contains },
          { email: contains },
          { phone: contains },
          // "5552148890" should match "(555) 214-8890"
          ...(digits.length >= 4 ? [{ phone: { contains: digits.slice(-4) } }] : []),
        ],
      },
      select: { id: true, name: true, address: true, phone: true },
      orderBy: { name: "asc" },
      take: 6,
    }),
    db.job.findMany({
      where: { businessId, OR: [{ title: contains }, { category: contains }] },
      select: { id: true, title: true, customerId: true, customer: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    db.quote.findMany({
      where: {
        businessId,
        OR: [
          ...(parseQuoteNumber(q) ? [{ number: parseQuoteNumber(q)! }] : []),
          { title: contains },
          { customer: { name: contains } },
        ],
      },
      select: { id: true, number: true, title: true, customer: { select: { name: true } } },
      orderBy: { number: "desc" },
      take: 6,
    }),
  ])

  // The phone "last 4 digits" fallback can over-match; keep exact digit matches only.
  const phoneOk = (phone: string | null) =>
    digits.length < 4 || !phone || phone.replace(/\D/g, "").includes(digits)
  return [
    ...customers
      .filter(
        (c) =>
          phoneOk(c.phone) ||
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          (c.address ?? "").toLowerCase().includes(q.toLowerCase())
      )
      .map((c) => ({
        kind: "customer" as const,
        id: c.id,
        title: c.name,
        subtitle: c.address ?? c.phone ?? "Customer",
        href: `/customers/${c.id}`,
      })),
    ...jobs.map((j) => ({
      kind: "job" as const,
      id: j.id,
      title: j.title,
      subtitle: j.customer.name,
      href: `/customers/${j.customerId}?job=${j.id}`,
    })),
    ...quotes.map((x) => ({
      kind: "quote" as const,
      id: x.id,
      title: `Q-${x.number}${x.title ? ` · ${x.title}` : ""}`,
      subtitle: x.customer.name,
      href: `/quotes/${x.id}`,
    })),
  ]
}
