"use client"

import { useState, useSyncExternalStore, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Check,
  CreditCard,
  Download,
  Loader2,
  MoreVertical,
  Printer,
  RotateCcw,
  Send,
  Share2,
  Trash2,
  Wrench,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { formatMoney } from "@/lib/money"
import { TransactionDialog } from "@/features/books/components/transaction-dialog"
import {
  acceptQuoteAction,
  declineQuoteAction,
  deleteQuoteAction,
  markSentAction,
  reopenQuoteAction,
} from "../actions"

const noop = () => () => {}

/** Phones and tablets that can share a PDF file (Web Share API level 2). */
function canSharePdf() {
  if (typeof navigator.canShare !== "function" || !window.matchMedia("(pointer: coarse)").matches)
    return false
  return navigator.canShare({ files: [new File([""], "quote.pdf", { type: "application/pdf" })] })
}

function saveFile(href: string) {
  const a = document.createElement("a")
  a.href = href
  a.download = ""
  a.click()
}

/** Header actions by status (page-spec 5b): Draft / Sent / Accepted / Declined. */
export function QuoteActions({
  quote,
  total,
  paid,
  unpriced,
  lineCount,
  flush,
  currency,
  today,
}: {
  quote: {
    id: string
    number: number
    status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED"
    jobId: string | null
    customerId: string
    customerName: string
  }
  total: number
  paid: number
  unpriced: number
  lineCount: number
  flush: () => Promise<boolean>
  currency: string
  /** business-local day, for the payment date */
  today: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirm, setConfirm] = useState<null | "accept" | "decline" | "delete">(null)
  const [paying, setPaying] = useState(false)
  const balance = Math.max(0, total - paid)
  const blocked =
    lineCount === 0
      ? "Add at least one line first."
      : unpriced
        ? `Enter a price for ${unpriced} item${unpriced === 1 ? "" : "s"} first.`
        : null

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      if (!(await flush())) {
        toast.error("Couldn't save your latest changes. Check the highlighted fields.")
        return
      }
      const res = await fn()
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong")
        return
      }
      toast.success(success)
      router.refresh()
    })

  const pdfUrl = `/api/quotes/${quote.id}/pdf`
  const canShare = useSyncExternalStore(noop, canSharePdf, () => false)

  /** Save pending edits, then hand over the PDF (D5: Dylan sends it himself). */
  const withPdf = async (go: () => void | Promise<void>) => {
    if (blocked) {
      toast.error(blocked)
      return
    }
    if (!(await flush())) {
      toast.error("Couldn't save your latest changes.")
      return
    }
    await go()
  }
  const preview = () => withPdf(() => void window.open(pdfUrl, "_blank", "noopener"))
  const download = () => withPdf(() => saveFile(`${pdfUrl}?download=1`))
  const share = () =>
    withPdf(async () => {
      const res = await fetch(pdfUrl)
      if (!res.ok) {
        toast.error(await res.text())
        return
      }
      const file = new File([await res.blob()], `Q-${quote.number}.pdf`, {
        type: "application/pdf",
      })
      try {
        await navigator.share({ files: [file], title: `Quote Q-${quote.number}` })
      } catch (e) {
        // closing the share sheet is not an error; anything else falls back to a download
        if ((e as Error).name !== "AbortError") saveFile(`${pdfUrl}?download=1`)
      }
    })
  const pdfItems = (
    <>
      <DropdownMenuItem onSelect={download}>
        <Download /> Download PDF
      </DropdownMenuItem>
      {canShare && (
        <DropdownMenuItem onSelect={share}>
          <Share2 /> Share PDF
        </DropdownMenuItem>
      )}
    </>
  )

  const status = quote.status
  return (
    <>
      {(status === "DRAFT" || status === "SENT") && (
        <>
          <Button
            variant="secondary"
            onClick={preview}
            disabled={pending}
            title={blocked ?? undefined}
          >
            <Printer /> Preview
          </Button>
          {status === "DRAFT" && (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() =>
                blocked
                  ? toast.error(blocked)
                  : act(() => markSentAction(quote.id), `Quote Q-${quote.number} marked as sent`)
              }
            >
              <Send /> Mark as sent
            </Button>
          )}
          <Button
            disabled={pending}
            onClick={() => (blocked ? toast.error(blocked) : setConfirm("accept"))}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Check />} Accept and create job
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="More quote actions"
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-surface outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink"
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {pdfItems}
              <DropdownMenuItem onSelect={() => setConfirm("decline")}>
                <X /> Mark declined
              </DropdownMenuItem>
              {status === "DRAFT" && (
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("delete")}>
                  <Trash2 /> Delete draft
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {status === "ACCEPTED" && (
        <>
          <Button variant="secondary" asChild>
            <a href={pdfUrl} target="_blank" rel="noopener">
              <Printer /> PDF
            </a>
          </Button>
          {quote.jobId && (
            <Button variant="secondary" asChild>
              <Link href={`/customers/${quote.customerId}?job=${quote.jobId}#job-${quote.jobId}`}>
                <Wrench /> Open job
              </Link>
            </Button>
          )}
          {balance > 0 ? (
            // disabled until the refresh after a payment lands, so the next prefill uses the new balance
            <Button onClick={() => setPaying(true)} disabled={pending}>
              <CreditCard /> Record payment
            </Button>
          ) : (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-mint px-3.5 text-[13px] font-semibold text-mint-ink">
              <Check className="size-4" /> Paid in full
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="More quote actions"
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-surface outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink"
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {pdfItems}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {status === "DECLINED" && (
        <Button
          onClick={() => act(() => reopenQuoteAction(quote.id), "Reopened as a draft")}
          disabled={pending}
        >
          <RotateCcw /> Reopen as draft
        </Button>
      )}

      <ConfirmDialog
        open={confirm === "accept"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Accept Q-${quote.number} for ${formatMoney(total, currency)}?`}
        description={
          quote.jobId
            ? "The linked job moves to Scheduled. The quote is locked after this."
            : "A new Scheduled job is added to the pipeline. The quote is locked after this."
        }
        confirmLabel="Accept and create job"
        onConfirm={async () => {
          if (!(await flush())) {
            toast.error("Couldn't save your latest changes.")
            return false
          }
          const res = await acceptQuoteAction(quote.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success(`Quote Q-${res.data.number} accepted, job added to pipeline`)
          router.refresh()
        }}
      />
      <ConfirmDialog
        open={confirm === "decline"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Mark Q-${quote.number} as declined?`}
        description="You can reopen it as a draft later."
        confirmLabel="Mark declined"
        onConfirm={async () => {
          const res = await declineQuoteAction(quote.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success(`Quote Q-${quote.number} declined`)
          router.refresh()
        }}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete draft Q-${quote.number}?`}
        description="The number won't be reused. This can't be undone."
        confirmLabel="Delete draft"
        onConfirm={async () => {
          const res = await deleteQuoteAction(quote.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success(`Deleted Q-${quote.number}`)
          router.push("/quotes")
        }}
      />
      <TransactionDialog
        open={paying}
        onOpenChange={setPaying}
        lockType
        onSaved={() => start(() => router.refresh())}
        customers={[{ id: quote.customerId, name: quote.customerName }]}
        quotes={[{ id: quote.id, label: `Q-${quote.number}`, customerId: quote.customerId }]}
        initial={{
          type: "INCOME",
          category: paid > 0 ? "JOB_PAYMENT" : "DEPOSIT",
          amountCents: balance,
          date: today,
          description: `${paid > 0 ? "Payment" : "Deposit"} for Q-${quote.number}`,
          customerId: quote.customerId,
          quoteId: quote.id,
        }}
      />
    </>
  )
}
