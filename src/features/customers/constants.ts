// Plain constants for client components (no zod in the customers list bundle).

export const CUSTOMER_FILTERS = ["all", "active", "none", "owes"] as const
export type CustomerFilter = (typeof CUSTOMER_FILTERS)[number]
export const CUSTOMER_FILTER_LABEL: Record<CustomerFilter, string> = {
  all: "All customers",
  active: "Active jobs",
  none: "No jobs",
  owes: "Owes money",
}
