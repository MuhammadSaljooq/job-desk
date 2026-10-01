import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-field bg-surface-muted px-3.5 py-3 text-[14px] font-medium text-text outline-none placeholder:font-normal placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-blush-ink",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
