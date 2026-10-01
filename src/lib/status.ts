// Status vocabulary shared by every page: job stages, quote status, payment
// status, and the pastel "tone" each one is drawn with (CLAUDE.md > Job stage → color).

export type Tone = "neutral" | "lavender" | "sky" | "peach" | "mint" | "blush" | "ink" | "white"

export const JOB_STAGES = ["LEAD", "QUOTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"] as const
export type JobStage = (typeof JOB_STAGES)[number]

type StageMeta = { label: string; progress: number; tone: Tone }

export const STAGE_META: Record<JobStage, StageMeta> = {
  LEAD: { label: "Lead", progress: 10, tone: "neutral" },
  QUOTED: { label: "Quoted", progress: 30, tone: "lavender" },
  SCHEDULED: { label: "Scheduled", progress: 50, tone: "sky" },
  IN_PROGRESS: { label: "In progress", progress: 75, tone: "peach" },
  COMPLETED: { label: "Completed", progress: 100, tone: "mint" },
}

export const QUOTE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "DECLINED"] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const QUOTE_STATUS_META: Record<QuoteStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SENT: { label: "Sent", tone: "sky" },
  ACCEPTED: { label: "Accepted", tone: "mint" },
  DECLINED: { label: "Declined", tone: "blush" },
}

export type PaymentStatus = "NONE" | "UNPAID" | "PART_PAID" | "PAID"

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: Tone }> = {
  NONE: { label: "None yet", tone: "white" },
  UNPAID: { label: "Unpaid", tone: "blush" },
  PART_PAID: { label: "Part paid", tone: "peach" },
  PAID: { label: "Paid", tone: "mint" },
}

/** Tailwind classes per tone. Pills use bg + text; job cards use card + bar + track. */
export const TONE_CLASSES: Record<
  Tone,
  { pill: string; card: string; bar: string; track: string; chip: string; dot: string }
> = {
  neutral: {
    pill: "bg-neutral-pill text-neutral-ink",
    card: "bg-surface-muted",
    bar: "bg-slate",
    track: "bg-black/[0.07]",
    chip: "bg-slate text-white",
    dot: "bg-slate",
  },
  lavender: {
    pill: "bg-lavender text-lavender-ink",
    card: "bg-lavender",
    bar: "bg-lavender-ink",
    track: "bg-black/[0.07]",
    chip: "bg-lavender-ink text-white",
    dot: "bg-lavender-ink",
  },
  sky: {
    pill: "bg-sky text-sky-ink",
    card: "bg-sky",
    bar: "bg-sky-ink",
    track: "bg-black/[0.07]",
    chip: "bg-sky-ink text-white",
    dot: "bg-sky-ink",
  },
  peach: {
    pill: "bg-peach text-peach-ink",
    card: "bg-peach",
    bar: "bg-peach-bar",
    track: "bg-black/[0.07]",
    chip: "bg-peach-bar text-white",
    dot: "bg-peach-bar",
  },
  mint: {
    pill: "bg-mint text-mint-ink",
    card: "bg-mint",
    bar: "bg-mint-ink",
    track: "bg-black/[0.07]",
    chip: "bg-mint-ink text-white",
    dot: "bg-mint-ink",
  },
  blush: {
    pill: "bg-blush text-blush-ink",
    card: "bg-blush",
    bar: "bg-blush-bar",
    track: "bg-black/[0.07]",
    chip: "bg-blush-bar text-white",
    dot: "bg-blush-bar",
  },
  ink: {
    pill: "bg-ink text-ink-foreground",
    card: "bg-ink text-ink-foreground",
    bar: "bg-ink",
    track: "bg-black/[0.07]",
    chip: "bg-ink text-ink-foreground",
    dot: "bg-ink",
  },
  white: {
    pill: "bg-surface text-text-muted",
    card: "bg-surface",
    bar: "bg-ink",
    track: "bg-black/[0.07]",
    chip: "bg-surface text-text",
    dot: "bg-text-subtle",
  },
}

/** Overdue = SCHEDULED or IN_PROGRESS with a date before today (decision D10). */
export function isOverdue(stage: JobStage, scheduledDay: string | null, today: string): boolean {
  if (!scheduledDay) return false
  if (stage !== "SCHEDULED" && stage !== "IN_PROGRESS") return false
  return scheduledDay < today
}

/** The tone a job is drawn with: overdue wins over the stage colour. */
export function jobTone(stage: JobStage, overdue: boolean): Tone {
  return overdue ? "blush" : STAGE_META[stage].tone
}
