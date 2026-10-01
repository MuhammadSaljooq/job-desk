"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, SendHorizontal } from "lucide-react"
import { toast } from "sonner"
import { InboxCard, type InboxItem } from "@/components/shared/inbox-card"
import { addNoteAction } from "../actions"

/** Notes and messages: add a note, see this customer's activity (actor avatars). */
export function NotesCard({
  customerId,
  items,
  viewAllHref,
}: {
  customerId: string
  items: InboxItem[]
  viewAllHref?: string
}) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [pending, start] = useTransition()
  const input = useRef<HTMLInputElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    start(async () => {
      const res = await addNoteAction(customerId, text)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setBody("")
      toast.success("Note added")
      router.refresh()
      input.current?.focus()
    })
  }

  return (
    <InboxCard
      title="Notes and messages"
      items={items}
      viewAllHref={viewAllHref}
      composer={
        <form onSubmit={submit} className="relative mb-2">
          <label htmlFor="note-input" className="sr-only">
            Add a note
          </label>
          <input
            id="note-input"
            ref={input}
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a note, call or text you logged…"
            className="h-10 w-full rounded-full bg-surface-muted pr-11 pl-4 text-[13px] text-text outline-none placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ink"
          />
          <button
            type="submit"
            aria-label="Add note"
            disabled={pending || !body.trim()}
            className="absolute top-1 right-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-ink text-ink-foreground disabled:opacity-30"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </button>
        </form>
      }
      empty={
        <p className="py-6 text-center text-[13px] text-text-muted">
          No notes yet. Add the first one above.
        </p>
      }
    />
  )
}
