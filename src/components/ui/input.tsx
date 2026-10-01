import * as React from "react"
import { cn } from "cn"

// JobDesk input: muted fill, no border, 12px radius, 40px high, 2px ink focus ring.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-field bg-surface-muted px-3.5 text-[14px] font-medium text-text transition-shadow outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:font-normal placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-blush-ink",
        className
      )}
      {...props}
    />
  )
}

export { Input }
