import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// JobDesk buttons: pill shaped, 36px high, 13px semibold (CLAUDE.md > Shape and spacing).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,opacity] outline-none select-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-45 aria-invalid:ring-2 aria-invalid:ring-blush-ink [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[15px]",
  {
    variants: {
      variant: {
        // ink pill with white text
        default: "bg-ink text-ink-foreground hover:bg-ink/85",
        // white pill with ink text (breadcrumb secondary actions)
        secondary: "bg-surface text-text hover:bg-surface-muted",
        // muted pill inside cards
        muted: "bg-surface-muted text-text hover:bg-divider",
        outline: "border border-divider bg-surface text-text hover:bg-surface-muted",
        ghost: "text-text hover:bg-surface-muted",
        destructive: "bg-blush text-blush-ink hover:bg-blush/70",
        link: "rounded-none px-0 text-text-muted underline-offset-4 hover:text-text hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3 text-[12px]",
        lg: "h-10 px-4 text-[14px]",
        // round icon buttons
        icon: "size-9",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-[14px]",
        "icon-lg": "size-10 [&_svg:not([class*='size-'])]:size-[16px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
