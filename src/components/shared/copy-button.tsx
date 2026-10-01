"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"
import { RowAction } from "./detail-row"

/** Copies a value to the clipboard and confirms with a toast. */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  return (
    <RowAction
      label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          toast.success("Copied to clipboard")
        } catch {
          toast.error("Couldn't copy. Select the text and copy it instead.")
        }
      }}
    >
      <Copy />
    </RowAction>
  )
}
