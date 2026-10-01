import { cn } from "cn"
import { colorForName, initials } from "@/lib/avatar"

const SIZES = {
  xs: "size-[22px] text-[9px]",
  sm: "size-8 text-[11px]",
  md: "size-10 text-[14px]",
  lg: "size-[52px] text-[19px]",
  xl: "size-14 text-[20px]",
} as const

export type AvatarSize = keyof typeof SIZES

/** Round avatar with white initials on a palette colour. */
export function InitialsAvatar({
  name,
  color,
  size = "md",
  className,
}: {
  name: string
  color?: string | null
  size?: AvatarSize
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight text-white select-none",
        SIZES[size],
        className
      )}
      style={{ backgroundColor: color ?? colorForName(name) }}
    >
      {initials(name)}
    </span>
  )
}

/** Overlapping crew avatars plus a "+" circle (JobCard). */
export function AvatarStack({
  people,
  max = 3,
  showAdd = true,
  className,
}: {
  people: { name: string; color?: string | null }[]
  max?: number
  showAdd?: boolean
  className?: string
}) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  return (
    <div className={cn("relative flex items-center", className)}>
      <span className="sr-only">
        {people.length ? `Assigned: ${people.map((p) => p.name).join(", ")}` : "Nobody assigned"}
      </span>
      {shown.map((p, i) => (
        <InitialsAvatar
          key={p.name + i}
          name={p.name}
          color={p.color}
          size="xs"
          className={cn("ring-2 ring-white/80", i > 0 && "-ml-1.5")}
        />
      ))}
      {extra > 0 && (
        <span className="-ml-1.5 inline-flex size-[22px] items-center justify-center rounded-full bg-surface text-[9px] font-semibold text-text ring-2 ring-white/80">
          +{extra}
        </span>
      )}
      {showAdd && extra <= 0 && (
        <span
          aria-hidden
          className={cn(
            "inline-flex size-[22px] items-center justify-center rounded-full bg-surface text-[13px] leading-none font-medium text-text ring-2 ring-white/80",
            shown.length > 0 && "-ml-1.5"
          )}
        >
          +
        </span>
      )}
    </div>
  )
}
