"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function DevToastButton() {
  return (
    <Button
      variant="secondary"
      onClick={() => toast.success("Added Ceiling Fan Install. Enter your price.")}
    >
      Show toast
    </Button>
  )
}
