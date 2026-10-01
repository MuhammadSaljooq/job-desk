"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
  urlKey,
  children,
}: {
  initial: TxFormValues
  links: LinkOptions
  variant?: "default" | "secondary"
  /** opens on ?new={urlKey} (the + New menu links), and clears it on close */
  urlKey?: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [clicked, setClicked] = useState(false)
  const fromUrl = !!urlKey && params.get("new") === urlKey
  const setOpen = (o: boolean) => {
    setClicked(o)
    if (!o && fromUrl) {
      const sp = new URLSearchParams(params.toString())
      sp.delete("new")
      router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false })
    }
  }
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <TransactionDialog
        open={clicked || fromUrl}
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
      <NewEntryButton
        variant="secondary"
        initial={blankEntry("EXPENSE", today)}
        links={links}
        urlKey="expense"
      >
        <Minus /> Log expense
      </NewEntryButton>
      <NewEntryButton initial={blankEntry("INCOME", today)} links={links} urlKey="income">
        <Plus /> Record revenue
      </NewEntryButton>
    </>
  )
}
