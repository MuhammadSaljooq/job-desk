"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Search, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import { EmptyState } from "@/components/shared/empty-state"
import { createQuoteAction } from "../actions"

/** Who is the quote for? Tapping a customer creates the draft and opens the builder. */
export function NewQuoteForm({
  customers,
  presetCustomerId,
  presetJobId,
}: {
  customers: { id: string; name: string }[]
  presetCustomerId: string | null
  presetJobId: string | null
}) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [pending, start] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const started = useRef(false)

  const create = (customerId: string, jobId: string | null = null) => {
    setBusyId(customerId)
    start(async () => {
      const res = await createQuoteAction({ customerId, jobId })
      if (!res.ok) {
        toast.error(res.error)
        setBusyId(null)
        return
      }
      router.replace(`/quotes/${res.data.id}`)
    })
  }

  // From a customer profile (?customer=...): skip the picker.
  useEffect(() => {
    if (presetCustomerId && !started.current) {
      started.current = true
      create(presetCustomerId, presetJobId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once
  }, [])

  if (presetCustomerId) {
    return (
      <div className="flex items-center gap-2 rounded-card bg-surface p-6 text-[14px]">
        <Loader2 className="size-4 animate-spin" /> Starting the quote…
      </div>
    )
  }

  const shown = customers.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <section className="max-w-xl rounded-card bg-surface p-5">
      <h2 className="text-[16px] font-semibold">Who is this quote for?</h2>
      <label className="relative mt-3 flex h-10 items-center">
        <span className="sr-only">Search customers</span>
        <Search className="pointer-events-none absolute left-3.5 size-4 text-text-muted" />
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers"
          className="h-10 w-full rounded-full bg-surface-muted pr-3 pl-10 text-[13px] outline-none placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ink"
        />
      </label>
      {customers.length === 0 ? (
        <EmptyState
          icon={<UserPlus />}
          title="Add a customer first"
          description="Quotes belong to a customer."
          action={
            <Button asChild>
              <Link href="/customers?new=customer">Add customer</Link>
            </Button>
          }
        />
      ) : (
        <ul
          className="mt-3 flex max-h-[50dvh] flex-col gap-0.5 overflow-y-auto"
          aria-label="Customers"
        >
          {shown.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => create(c.id)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-2.5 py-2 text-left text-[14px] font-semibold outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink disabled:opacity-60"
              >
                <InitialsAvatar name={c.name} size="sm" />
                <span className="flex-1">{c.name}</span>
                {busyId === c.id && <Loader2 className="size-4 animate-spin" />}
              </button>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="px-2.5 py-4 text-[13px] text-text-muted">No customer called “{q}”.</li>
          )}
        </ul>
      )}
    </section>
  )
}
