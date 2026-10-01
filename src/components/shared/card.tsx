import { cn } from "cn"

/** The white floating panel every page is built from. */
export function Card({
  title,
  icon,
  action,
  children,
  className,
  bodyClassName,
  as: Tag = "section",
  ...rest
}: {
  title?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  as?: "section" | "div" | "article"
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  return (
    <Tag className={cn("min-w-0 rounded-card bg-surface p-5", className)} {...rest}>
      {(title || action) && (
        <header className="mb-4 flex min-h-8 items-center justify-between gap-3">
          {title && (
            <h2 className="flex items-center gap-2 text-[16px] font-semibold text-text">
              {title}
              {icon && <span className="text-text [&_svg]:size-4">{icon}</span>}
            </h2>
          )}
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  )
}
