"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { deleteCustomerAction } from "../actions"
import { useProfileDialogs } from "./profile-dialogs"

/** Kebab on the profile card: edit, + job, new quote, delete (owner). */
export function ProfileCardMenu({
  customerId,
  name,
  canDelete,
}: {
  customerId: string
  name: string
  canDelete: boolean
}) {
  const router = useRouter()
  const { editCustomer, newJob } = useProfileDialogs()
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Customer options"
          className="-mr-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-text-muted outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink"
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={editCustomer}>
            <Pencil /> Edit details
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => newJob()}>
            <Plus /> New job
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/quotes/new?customer=${customerId}`}>
              <FileText /> New quote
            </Link>
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
                <Trash2 /> Delete customer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${name}?`}
        description="This also deletes their jobs, quotes and notes. Payments stay in your books without a customer. This can't be undone."
        confirmLabel="Delete customer"
        onConfirm={async () => {
          const res = await deleteCustomerAction(customerId)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success(`Deleted ${res.data.name}`)
          router.push("/customers")
        }}
      />
    </>
  )
}
