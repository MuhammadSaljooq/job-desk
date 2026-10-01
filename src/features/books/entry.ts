import type { TxFormValues } from "./components/transaction-dialog"

/** Empty transaction form values (shared by server pages and client buttons). */
export function blankEntry(
  type: TxFormValues["type"],
  today: string,
  customerId: string | null = null
): TxFormValues {
  return {
    type,
    category: type === "INCOME" ? "JOB_PAYMENT" : "MATERIALS",
    amountCents: null,
    date: today,
    description: "",
    customerId,
    quoteId: null,
  }
}
