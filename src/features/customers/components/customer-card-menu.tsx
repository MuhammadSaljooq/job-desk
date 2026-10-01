"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreVertical, Pencil, Trash2, UserRound } from "lucide-react"
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

/** Kebab menu on a customer card: open, edit (on the profile), delete (owner only). */
export function CustomerCardMenu({
  customerId,
  name,
  canDelete,
}: {
  customerId: string
  name: string
  canDelete: boolean
}) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Options for ${name}`}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-text-muted outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink"
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/customers/${customerId}`}>
              <UserRound /> Open profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/customers/${customerId}?edit=1`}>
              <Pencil /> Edit details
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
          router.refresh()
        }}
      />
    </>
  )
}
