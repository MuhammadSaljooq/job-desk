import { cn } from "cn"

/** Icon circle, tiny label over a value, optional pill, trailing muted action (copy, call, map, edit). */
export function DetailRow({
  icon,
  label,
  value,
  pill,
  action,
  href,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  pill?: React.ReactNode
  action?: React.ReactNode
  /** makes the label + value a link (e.g. "Revenue" opens Bookkeeping) */
  href?: string
  className?: string
}) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="field-label block">{label}</span>
        <span className="mt-0.5 block truncate text-[14px] font-semibold text-text">
          {value || <span className="font-normal text-text-subtle">Not set</span>}
        </span>
      </span>
    </>
  )
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-divider py-3 last:border-b-0",
        className
      )}
    >
      {href ? (
        <a
          href={href}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-field outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          {content}
        </a>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
      )}
      {pill}
      {action && <span className="shrink-0 text-text-subtle">{action}</span>}
    </div>
  )
}

/** The small muted trailing icon button used inside DetailRow. */
export function RowAction({
  label,
  children,
  href,
  onClick,
}: {
  label: string
  children: React.ReactNode
  href?: string
  onClick?: () => void
}) {
  const cls =
    "inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-text-subtle transition-colors hover:bg-surface-muted hover:text-text focus-visible:ring-2 focus-visible:ring-ink outline-none [&_svg]:size-4"
  return href ? (
    <a href={href} aria-label={label} title={label} className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cls}>
      {children}
    </button>
  )
}
