"use client"

import { useRef } from "react"
import { Pencil } from "lucide-react"
import { cn } from "cn"

/**
 * A settings row like shot-settings.png: icon circle, tiny label, the value. The value is an
 * input styled as text (fill + ring on hover / focus), and the pencil focuses it. Read-only
 * for staff: no pencil, the input can't be edited.
 */
export function FieldRow({
  id,
  icon,
  label,
  value,
  onChange,
  readOnly,
  placeholder,
  error,
  inputMode,
  type = "text",
  prefix,
  trailing,
}: {
  id: string
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
  placeholder?: string
  error?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  type?: string
  prefix?: string
  trailing?: React.ReactNode
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-3 border-b border-divider py-2.5 last:border-b-0">
      <RowIcon>{icon}</RowIcon>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="field-label block">
          {label}
        </label>
        <div className="flex items-center">
          {prefix && <span className="text-[14px] font-semibold">{prefix}</span>}
          <input
            ref={ref}
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            placeholder={placeholder}
            inputMode={inputMode}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              "-ml-1.5 h-8 w-full min-w-0 rounded-[8px] bg-transparent px-1.5 text-[14px] font-semibold text-text outline-none placeholder:font-normal placeholder:text-text-subtle",
              !readOnly &&
                "hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ink",
              error && "ring-2 ring-blush-ink"
            )}
          />
        </div>
        {error && (
          <p id={`${id}-error`} className="mt-0.5 text-[12px] text-blush-ink">
            {error}
          </p>
        )}
      </div>
      {trailing ??
        (!readOnly && (
          <button
            type="button"
            onClick={() => ref.current?.focus()}
            aria-label={`Edit ${label}`}
            tabIndex={-1}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-subtle hover:bg-surface-muted hover:text-text"
          >
            <Pencil className="size-4" />
          </button>
        ))}
    </div>
  )
}

export function RowIcon({ children, tone }: { children: React.ReactNode; tone?: "danger" }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-4",
        tone === "danger" ? "bg-blush text-blush-ink" : "bg-surface-muted text-text"
      )}
    >
      {children}
    </span>
  )
}

export function SettingsCard({
  title,
  icon,
  action,
  children,
  className,
  id,
}: {
  title: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  id: string
}) {
  return (
    <section className={cn("min-w-0 rounded-card bg-surface p-5", className)} aria-labelledby={id}>
      <header className="mb-2 flex min-h-9 items-center justify-between gap-3">
        <h2 id={id} className="text-[16px] font-semibold">
          {title}
        </h2>
        {action ?? (icon && <span className="text-text-muted [&_svg]:size-4">{icon}</span>)}
      </header>
      {children}
    </section>
  )
}
