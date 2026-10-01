import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "cn"

/**
 * Back arrow + page title on the left, a slot for filter pills and actions on the right.
 * Every page renders one at the top of its content.
 */
export function Breadcrumb({
  title,
  backHref,
  badge,
  children,
  className,
}: {
  title: React.ReactNode
  /** where the back arrow goes; defaults to Home */
  backHref?: string
  badge?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 md:mb-[21px] lg:-ml-[78px]",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={backHref ?? "/"}
          aria-label="Back"
          className="-ml-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-text outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ink"
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <h1 className="min-w-0 truncate text-[20px] font-semibold tracking-tight text-text md:text-[22px]">
          {title}
        </h1>
        {badge}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

/** White pill with a coloured dot ("● In progress") used as a breadcrumb filter. */
export function FilterPill({
  dotClassName = "bg-peach-bar",
  children,
  className,
  ...props
}: {
  dotClassName?: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-semibold text-text outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink",
        className
      )}
      {...props}
    >
      <span className={cn("size-1.5 rounded-full", dotClassName)} aria-hidden />
      {children}
    </button>
  )
}
