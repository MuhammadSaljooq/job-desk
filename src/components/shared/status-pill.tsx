import { cn } from "cn"
import {
  PAYMENT_STATUS_META,
  QUOTE_STATUS_META,
  STAGE_META,
  TONE_CLASSES,
  jobTone,
  type JobStage,
  type PaymentStatus,
  type QuoteStatus,
  type Tone,
} from "@/lib/status"

type Props = {
  tone: Tone
  children: React.ReactNode
  size?: "sm" | "md"
  icon?: React.ReactNode
  className?: string
}

/** Pastel pill with its ink text colour: "Scheduled", "Paid", "Active ✓". */
export function StatusPill({ tone, children, size = "sm", icon, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "sm" ? "h-6 px-2.5 text-[11.5px]" : "h-8 px-3 text-[13px]",
        TONE_CLASSES[tone].pill,
        className
      )}
    >
      {children}
      {icon}
    </span>
  )
}

export function StagePill({
  stage,
  overdue = false,
  className,
}: {
  stage: JobStage
  overdue?: boolean
  className?: string
}) {
  return (
    <StatusPill tone={jobTone(stage, overdue)} className={className}>
      {overdue ? "Overdue" : STAGE_META[stage].label}
    </StatusPill>
  )
}

export function QuoteStatusPill({ status }: { status: QuoteStatus }) {
  const meta = QUOTE_STATUS_META[status]
  return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
}

export function PaymentPill({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status]
  if (status === "NONE") return <span className="text-[13px] text-text-subtle">{meta.label}</span>
  return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
}
