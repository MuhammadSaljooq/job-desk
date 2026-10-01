import { cn } from "cn"

/** One sentence and one clear action (page-spec > Shared behavior > States). */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card px-6 py-10 text-center",
        className
      )}
    >
      {icon && (
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-text [&_svg]:size-5">
          {icon}
        </span>
      )}
      <p className="text-[15px] font-semibold text-text">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Inline error panel: what went wrong and how to fix it. */
export function ErrorState({
  title = "Something went wrong",
  description = "Please try again. If it keeps happening, reload the page.",
  action,
  className,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div role="alert" className={cn("rounded-card bg-blush px-5 py-4 text-blush-ink", className)}>
      <p className="text-[14px] font-semibold">{title}</p>
      <p className="mt-0.5 text-[13px]">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
