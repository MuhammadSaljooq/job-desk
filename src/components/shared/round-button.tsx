import Link from "next/link"
import { cn } from "cn"

type Common = {
  label: string
  children: React.ReactNode
  /** ink background with a white icon (the first ProfileCard action, active states) */
  primary?: boolean
  /** white circle (header tools, breadcrumb back) instead of muted */
  white?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE = { sm: "size-8", md: "size-9", lg: "size-10" } as const

function classes({ primary, white, size = "md", className }: Omit<Common, "label" | "children">) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 [&_svg]:size-4 [&_svg]:shrink-0",
    SIZE[size],
    primary
      ? "bg-ink text-ink-foreground hover:bg-ink/85"
      : white
        ? "bg-surface text-text hover:bg-surface-muted"
        : "bg-surface-muted text-text hover:bg-divider",
    className
  )
}

/** A round icon button (36px by default). Renders a link when href is given. */
export function RoundButton({
  label,
  children,
  href,
  external,
  ...rest
}: Common & { href?: string; external?: boolean } & Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "children"
  >) {
  const { primary, white, size, className, ...buttonProps } = rest
  const cls = classes({ primary, white, size, className })
  if (href) {
    const isExternal = external ?? /^(https?:|tel:|sms:|mailto:)/.test(href)
    return isExternal ? (
      <a
        href={href}
        aria-label={label}
        title={label}
        className={cls}
        {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    ) : (
      <Link href={href} aria-label={label} title={label} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" aria-label={label} title={label} className={cls} {...buttonProps}>
      {children}
    </button>
  )
}
