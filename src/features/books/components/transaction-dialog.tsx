"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormField } from "@/components/shared/form-field"
import { centsToInput, toCents } from "@/lib/money"
import { CATEGORY_LABEL, categoriesFor, type TxCategory, type TxType } from "../categories"
import { createTransactionAction, updateTransactionAction } from "../actions"

export type TxFormValues = {
  type: TxType
  category: TxCategory
  amountCents: number | null
  date: string
  description: string
  customerId: string | null
  quoteId: string | null
}

export type TxQuoteOption = { id: string; label: string; customerId: string }

const NONE = "__none"

/** Record revenue / log expense (page-spec Page 6 > Record entry form). */
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionId?: string
  initial: TxFormValues
  customers: { id: string; name: string }[]
  quotes: TxQuoteOption[]
  /** Record payment from a quote: revenue only */
  lockType?: boolean
  /** Called after a save instead of `router.refresh()`, so the caller can track the refresh. */
  onSaved?: () => void
}

export function TransactionDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Content unmounts when closed, so the form starts fresh from `initial` each time. */}
        <TransactionForm {...props} />
      </DialogContent>
    </Dialog>
  )
}

function TransactionForm({
  onOpenChange,
  transactionId,
  initial,
  customers,
  quotes,
  lockType = false,
  onSaved,
}: Props) {
  const router = useRouter()
  const [v, setV] = useState(initial)
  const [amount, setAmount] = useState(centsToInput(initial.amountCents))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()

  const setType = (type: TxType) =>
    setV((s) => ({
      ...s,
      type,
      category: categoriesFor(type).includes(s.category) ? s.category : categoriesFor(type)[0],
      quoteId: type === "EXPENSE" ? null : s.quoteId,
    }))

  const quoteOptions = quotes.filter((q) => !v.customerId || q.customerId === v.customerId)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const cents = toCents(amount)
    const errs: Record<string, string> = {}
    if (cents === null || cents <= 0) errs.amountCents = "Enter an amount like 125.00"
    if (!v.description.trim()) errs.description = "Add a short description"
    if (!v.date) errs.date = "Pick a date"
    setErrors(errs)
    if (Object.keys(errs).length) return
    start(async () => {
      const payload = { ...v, amountCents: cents! }
      const res = transactionId
        ? await updateTransactionAction(transactionId, payload)
        : await createTransactionAction(payload)
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {})
        toast.error(res.error)
        return
      }
      toast.success(
        transactionId ? "Entry saved" : v.type === "INCOME" ? "Payment recorded" : "Expense logged"
      )
      onOpenChange(false)
      if (onSaved) onSaved()
      else router.refresh()
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {transactionId ? "Edit entry" : v.type === "INCOME" ? "Record revenue" : "Log expense"}
        </DialogTitle>
        <DialogDescription>
          {v.type === "INCOME"
            ? "Money in: payments and deposits."
            : "Money out: materials, fuel, tools…"}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {!lockType && (
          <div
            role="radiogroup"
            aria-label="Type"
            className="inline-flex w-fit rounded-full bg-surface-muted p-1"
          >
            {(["INCOME", "EXPENSE"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={v.type === t}
                onClick={() => setType(t)}
                className={cn(
                  "h-8 cursor-pointer rounded-full px-4 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink",
                  v.type === t ? "bg-surface font-semibold shadow-sm" : "text-text-muted"
                )}
              >
                {t === "INCOME" ? "Revenue" : "Expense"}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount" htmlFor="tx-amount" error={errors.amountCents}>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-muted">
                $
              </span>
              <Input
                id="tx-amount"
                inputMode="decimal"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                aria-invalid={!!errors.amountCents}
                className="tabular pl-7"
              />
            </div>
          </FormField>
          <FormField label="Date" htmlFor="tx-date" error={errors.date}>
            <Input
              id="tx-date"
              type="date"
              value={v.date}
              onChange={(e) => setV({ ...v, date: e.target.value })}
              aria-invalid={!!errors.date}
            />
          </FormField>
        </div>
        <FormField label="Category" htmlFor="tx-category" error={errors.category}>
          <Select
            value={v.category}
            onValueChange={(c) => setV({ ...v, category: c as TxCategory })}
          >
            <SelectTrigger id="tx-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoriesFor(v.type).map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Description" htmlFor="tx-desc" error={errors.description}>
          <Input
            id="tx-desc"
            value={v.description}
            maxLength={200}
            onChange={(e) => setV({ ...v, description: e.target.value })}
            placeholder={
              v.type === "INCOME" ? "Payment for Q-1001" : "Drywall, compound and screws"
            }
            aria-invalid={!!errors.description}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Customer (optional)" htmlFor="tx-customer">
            <Select
              value={v.customerId ?? NONE}
              onValueChange={(c) =>
                setV({
                  ...v,
                  customerId: c === NONE ? null : c,
                  quoteId:
                    v.quoteId && quotes.find((q) => q.id === v.quoteId)?.customerId !== c
                      ? null
                      : v.quoteId,
                })
              }
            >
              <SelectTrigger id="tx-customer" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {v.type === "INCOME" && (
            <FormField label="Quote (optional)" htmlFor="tx-quote" error={errors.quoteId}>
              <Select
                value={v.quoteId ?? NONE}
                onValueChange={(q) => {
                  const opt = quotes.find((o) => o.id === q)
                  setV({
                    ...v,
                    quoteId: q === NONE ? null : q,
                    customerId: opt?.customerId ?? v.customerId,
                  })
                }}
              >
                <SelectTrigger id="tx-quote" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {quoteOptions.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </div>
        <DialogFooter className="gap-2 pt-1 sm:gap-2">
          <Button type="button" variant="muted" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {transactionId ? "Save entry" : v.type === "INCOME" ? "Record revenue" : "Log expense"}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
