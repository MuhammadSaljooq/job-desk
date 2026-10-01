import Link from "next/link"
import { cn } from "cn"
import { TONE_CLASSES, type Tone } from "@/lib/status"

/** Pastel or white summary card: label, big value, muted caption. */
export function KpiCard({
  label,
  value,
  caption,
  tone = "white",
  href,
  className,
}: {
  label: string
  value: React.ReactNode
  caption?: React.ReactNode
  tone?: Tone
  href?: string
  className?: string
}) {
  const cls = cn(
    "block min-w-0 rounded-card px-5 py-[18px] outline-none",
    tone === "white" ? "bg-surface" : TONE_CLASSES[tone].card,
    href &&
      "transition-[filter] hover:brightness-[0.98] focus-visible:ring-2 focus-visible:ring-ink",
    className
  )
  const body = (
    <>
      <p className="text-[13px] font-medium text-text">{label}</p>
      <p className="tabular mt-1 truncate text-[26px] leading-tight font-bold tracking-tight text-text">
        {value}
      </p>
      {caption && <p className="mt-1 truncate text-[12px] text-text-muted">{caption}</p>}
    </>
  )
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
