import { CalendarDays, Check } from "lucide-react"
import { cn } from "cn"
import { InitialsAvatar } from "./initials-avatar"
import { RoundButton } from "./round-button"
import { StatusPill } from "./status-pill"
import type { Tone } from "@/lib/status"

export type ProfileAction = {
  label: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
}

/**
 * Avatar, name and subtitle, a row of round action buttons (the first is ink),
 * a "since" date pill and a status pill. Used for customers, the owner and the business.
 */
export function ProfileCard({
  name,
  subtitle,
  avatarColor,
  actions,
  sinceLabel,
  sinceValue,
  status,
  menu,
  footer,
  className,
}: {
  name: string
  subtitle?: string
  avatarColor?: string | null
  actions: ProfileAction[]
  sinceLabel: string
  sinceValue: React.ReactNode
  status?: { label: string; tone: Tone; check?: boolean } | React.ReactNode
  menu?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("min-w-0 rounded-card bg-surface p-5", className)}>
      <div className="flex items-start gap-3.5">
        <InitialsAvatar name={name} color={avatarColor} size="xl" />
        <div className="min-w-0 flex-1 pt-1.5">
          <h2 className="truncate text-[17px] leading-tight font-bold text-text">{name}</h2>
          {subtitle && <p className="mt-0.5 truncate text-[12.5px] text-text-muted">{subtitle}</p>}
        </div>
        {menu}
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {actions.map((a, i) => (
          <RoundButton
            key={a.label}
            label={a.label}
            href={a.href}
            onClick={a.onClick}
            primary={i === 0}
          >
            {a.icon}
          </RoundButton>
        ))}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="field-label">{sinceLabel}</p>
          <span className="mt-1.5 inline-flex h-8 items-center gap-2 rounded-full bg-surface-muted px-3 text-[13px] font-semibold text-text">
            {sinceValue}
            <CalendarDays className="size-3.5" aria-hidden />
          </span>
        </div>
        {status && isToneStatus(status) ? (
          <StatusPill
            tone={status.tone}
            size="md"
            icon={
              status.check ? (
                <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-current">
                  <Check className="size-3 text-white" strokeWidth={3} aria-hidden />
                </span>
              ) : null
            }
          >
            {status.label}
          </StatusPill>
        ) : (
          status
        )}
      </div>
      {footer}
    </section>
  )
}

function isToneStatus(s: unknown): s is { label: string; tone: Tone; check?: boolean } {
  return typeof s === "object" && s !== null && "tone" in s && "label" in s
}
