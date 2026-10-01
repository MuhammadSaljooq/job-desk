"use client"

import { useTransition } from "react"
import { CheckCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { markAllActivityReadAction } from "./actions"

export function MarkAllReadButton() {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await markAllActivityReadAction()
          if (res.ok) toast.success(`Marked ${res.data.count} as read`)
          else toast.error(res.error)
        })
      }
    >
      <CheckCheck /> Mark all read
    </Button>
  )
}
