"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { blankEntry } from "../entry"
import { TransactionDialog, type TxFormValues, type TxQuoteOption } from "./transaction-dialog"

export type LinkOptions = {
  customers: { id: string; name: string }[]
  quotes: TxQuoteOption[]
}

/** A button that opens the transaction form with `initial` filled in. */
export function NewEntryButton({
  initial,
  links,
  variant = "default",
  children,
}: {
  initial: TxFormValues
  links: LinkOptions
  variant?: "default" | "secondary"
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <TransactionDialog
        open={open}
        onOpenChange={setOpen}
        initial={initial}
        customers={links.customers}
        quotes={links.quotes}
      />
    </>
  )
}

/** Breadcrumb actions on /books: "Log expense" (secondary) and "Record revenue" (primary). */
export function EntryButtons({ today, links }: { today: string; links: LinkOptions }) {
  return (
    <>
      <NewEntryButton variant="secondary" initial={blankEntry("EXPENSE", today)} links={links}>
        <Minus /> Log expense
      </NewEntryButton>
      <NewEntryButton initial={blankEntry("INCOME", today)} links={links}>
        <Plus /> Record revenue
      </NewEntryButton>
    </>
  )
}
