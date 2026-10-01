// Ledger categories (page-spec Page 6). Stored as an enum; labels for the UI live here.

export const INCOME_CATEGORIES = ["JOB_PAYMENT", "DEPOSIT", "OTHER_INCOME"] as const
export const EXPENSE_CATEGORIES = [
  "MATERIALS",
  "TOOLS_EQUIPMENT",
  "FUEL_VEHICLE",
  "SUBCONTRACTOR",
  "INSURANCE",
  "MARKETING",
  "SOFTWARE",
  "OTHER_EXPENSE",
] as const

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
export type TxCategory = IncomeCategory | ExpenseCategory
export type TxType = "INCOME" | "EXPENSE"

export const CATEGORY_LABEL: Record<TxCategory, string> = {
  JOB_PAYMENT: "Job Payment",
  DEPOSIT: "Deposit",
  OTHER_INCOME: "Other Income",
  MATERIALS: "Materials",
  TOOLS_EQUIPMENT: "Tools & Equipment",
  FUEL_VEHICLE: "Fuel & Vehicle",
  SUBCONTRACTOR: "Subcontractor",
  INSURANCE: "Insurance",
  MARKETING: "Marketing",
  SOFTWARE: "Software",
  OTHER_EXPENSE: "Other",
}

export function categoriesFor(type: TxType): readonly TxCategory[] {
  return type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

export function categoryMatchesType(type: TxType, category: string): category is TxCategory {
  return (categoriesFor(type) as readonly string[]).includes(category)
}
