import { cn } from "cn"

/** Label above a control, with an optional hint and an error message underneath. */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="text-[12px] font-medium text-blush-ink">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-text-subtle">{hint}</p>
      ) : null}
    </div>
  )
}
