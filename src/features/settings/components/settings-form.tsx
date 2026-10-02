"use client"

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Building2,
  Check,
  ChevronDown,
  Clock,
  Coins,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Moon,
  Phone,
  Tag,
  Type,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { formatBps, percentToBps } from "@/lib/money"
import { CURRENCIES, COMMON_TIMEZONES } from "../constants"
import { saveSettingsAction, setThemeAction } from "../actions"
import type { SettingsView } from "../queries"
import { FieldRow, RowIcon, SettingsCard } from "./field-row"
import { LogoRow } from "./logo-row"

type Business = SettingsView["business"]

function initialValues(b: Business) {
  return {
    name: b.name,
    tagline: b.tagline ?? "",
    phone: b.phone ?? "",
    email: b.email ?? "",
    address: b.address ?? "",
    timezone: b.timezone,
    currency: b.currency,
    tax: formatBps(b.taxRateBps).replace("%", ""),
    nextQuoteNumber: String(b.nextQuoteNumber),
    quoteFooter: b.quoteFooter ?? "",
    notifyJobReminders: b.notifyJobReminders,
    notifyPayments: b.notifyPayments,
  }
}

/**
 * Business profile, Quotes and Appearance cards (shot-settings.png) with one "Save settings".
 * Leaving with unsaved changes asks first. Staff see the same cards read-only.
 */
export function SettingsForm({
  business,
  readOnly,
  highestQuoteNumber,
  businessCard,
  children,
}: {
  business: Business
  readOnly: boolean
  highestQuoteNumber: number
  /** the profile card (row 1, first column) */
  businessCard: React.ReactNode
  /** Team, Data and Storage cards, placed in the grid after these */
  children: React.ReactNode
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(() => initialValues(business))
  const [v, setV] = useState(saved)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()
  const dirty = useMemo(() => JSON.stringify(v) !== JSON.stringify(saved), [v, saved])
  const set =
    <K extends keyof typeof v>(k: K) =>
    (value: (typeof v)[K]) =>
      setV((s) => ({ ...s, [k]: value }))

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const timezones = useMemo(() => {
    const all = (COMMON_TIMEZONES as readonly string[]).slice()
    if (!all.includes(v.timezone)) all.unshift(v.timezone)
    return all
  }, [v.timezone])

  const save = () => {
    const errs: Record<string, string> = {}
    const taxRateBps = percentToBps(v.tax)
    if (taxRateBps === null) errs.taxRateBps = "Enter a tax rate like 8 or 8.25"
    const next = Number(v.nextQuoteNumber.replace(/^Q-/i, ""))
    if (!Number.isInteger(next) || next < 1) errs.nextQuoteNumber = "Enter a whole number"
    else if (next <= highestQuoteNumber)
      errs.nextQuoteNumber = `Must be above Q-${highestQuoteNumber}`
    if (!v.name.trim()) errs.name = "Add your business name"
    setErrors(errs)
    if (Object.keys(errs).length) {
      toast.error("Please check the highlighted fields.")
      return
    }
    start(async () => {
      const res = await saveSettingsAction({
        name: v.name,
        tagline: v.tagline,
        phone: v.phone,
        email: v.email,
        address: v.address,
        timezone: v.timezone,
        currency: v.currency,
        taxRateBps: taxRateBps!,
        nextQuoteNumber: next,
        quoteFooter: v.quoteFooter,
        notifyJobReminders: v.notifyJobReminders,
        notifyPayments: v.notifyPayments,
      })
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {})
        toast.error(res.error)
        return
      }
      setSaved(v)
      toast.success("Settings saved")
      router.refresh()
    })
  }

  return (
    <>
      <Breadcrumb title="Settings" backHref="/">
        {!readOnly && (
          <Button onClick={save} disabled={pending || !dirty}>
            {pending ? <Loader2 className="animate-spin" /> : <Check />}
            {dirty ? "Save settings" : "Saved"}
          </Button>
        )}
      </Breadcrumb>
      {readOnly && (
        <p className="mb-4 rounded-field bg-surface px-4 py-3 text-[13px] text-text-muted">
          Only the owner can change settings. You can still pick your own appearance.
        </p>
      )}
      <div className="grid gap-4 md:gap-[18px] lg:grid-cols-2 xl:grid-cols-3">
        {businessCard}

        <SettingsCard id="profile-title" title="Business profile" icon={<Building2 />}>
          <FieldRow
            id="set-name"
            icon={<Type />}
            label="Business name"
            value={v.name}
            onChange={set("name")}
            readOnly={readOnly}
            error={errors.name}
          />
          <FieldRow
            id="set-tagline"
            icon={<Tag />}
            label="Tagline"
            value={v.tagline}
            onChange={set("tagline")}
            readOnly={readOnly}
            placeholder="Handyman and home repair"
            error={errors.tagline}
          />
          <FieldRow
            id="set-phone"
            icon={<Phone />}
            label="Phone"
            value={v.phone}
            onChange={set("phone")}
            readOnly={readOnly}
            type="tel"
            placeholder="(555) 100-2000"
            error={errors.phone}
          />
          <FieldRow
            id="set-email"
            icon={<Mail />}
            label="Email"
            value={v.email}
            onChange={set("email")}
            readOnly={readOnly}
            type="email"
            placeholder="hello@yourcompany.com"
            error={errors.email}
          />
          <FieldRow
            id="set-address"
            icon={<MapPin />}
            label="Address"
            value={v.address}
            onChange={set("address")}
            readOnly={readOnly}
            placeholder="Shown on printed quotes"
            error={errors.address}
          />
          <SelectRow
            id="set-timezone"
            icon={<Clock />}
            label="Timezone"
            value={v.timezone}
            onChange={set("timezone")}
            readOnly={readOnly}
            options={timezones.map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") }))}
          />
          <LogoRow hasLogo={business.hasLogo} version={business.logoVersion} readOnly={readOnly} />
        </SettingsCard>

        <SettingsCard id="quotes-title" title="Quotes" icon={<FileText />}>
          <FieldRow
            id="set-tax"
            icon={<Tag />}
            label="Default tax %"
            value={v.tax}
            onChange={set("tax")}
            readOnly={readOnly}
            inputMode="decimal"
            placeholder="8"
            error={errors.taxRateBps}
          />
          <SelectRow
            id="set-currency"
            icon={<Coins />}
            label="Currency"
            value={v.currency}
            onChange={set("currency")}
            readOnly={readOnly}
            options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
          />
          <FieldRow
            id="set-next"
            icon={<FileText />}
            label="Next quote number"
            value={v.nextQuoteNumber}
            onChange={set("nextQuoteNumber")}
            readOnly={readOnly}
            inputMode="numeric"
            prefix="Q-"
            error={errors.nextQuoteNumber}
          />
          <FieldRow
            id="set-footer"
            icon={<MessageSquare />}
            label="Default footer"
            value={v.quoteFooter}
            onChange={set("quoteFooter")}
            readOnly={readOnly}
            placeholder="Thank you for the opportunity"
            error={errors.quoteFooter}
          />
        </SettingsCard>

        <SettingsCard id="appearance-title" title="Appearance" icon={<Moon />}>
          <ThemeSwitch />
          <div className="mt-3">
            <ToggleRow
              id="set-reminders"
              label="Job reminders"
              hint="Notify me the day before a visit"
              checked={v.notifyJobReminders}
              onChange={set("notifyJobReminders")}
              disabled={readOnly}
            />
            <ToggleRow
              id="set-payments"
              label="Payment alerts"
              hint="When a payment is recorded"
              checked={v.notifyPayments}
              onChange={set("notifyPayments")}
              disabled={readOnly}
            />
          </div>
        </SettingsCard>

        {children}
      </div>
    </>
  )
}

function SelectRow({
  id,
  icon,
  label,
  value,
  onChange,
  readOnly,
  options,
}: {
  id: string
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-3 border-b border-divider py-2.5 last:border-b-0">
      <RowIcon>{icon}</RowIcon>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="field-label block">
          {label}
        </label>
        <Select value={value} onValueChange={onChange} disabled={readOnly}>
          <SelectTrigger
            id={id}
            className="-ml-1.5 h-8! w-full border-0 bg-transparent px-1.5 text-[14px] font-semibold shadow-none hover:bg-surface-muted [&>svg:last-child]:hidden"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!readOnly && <ChevronDown className="size-4 shrink-0 text-text-subtle" aria-hidden />}
    </div>
  )
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-divider py-3 last:border-b-0">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-[14px] font-semibold">{label}</span>
        <span className="block text-[12px] text-text-muted">{hint}</span>
      </label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[size=default]:h-6 data-[size=default]:w-11 data-checked:bg-ink data-unchecked:bg-divider [&_[data-slot=switch-thumb]]:size-5"
      />
    </div>
  )
}

const THEMES = [
  { value: "system", label: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const

/** Personal (every user, staff too): applies now and is saved to the account. */
function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  // next-themes only knows the theme in the browser; render "Match device" on the server
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const current = mounted ? (theme ?? "system") : "system"
  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="inline-flex flex-wrap rounded-full bg-surface-muted p-1"
    >
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={current === t.value}
          onClick={async () => {
            setTheme(t.value)
            const res = await setThemeAction(t.value)
            if (!res.ok) toast.error(res.error)
          }}
          className={cn(
            "h-9 cursor-pointer rounded-full px-4 text-[13.5px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink",
            current === t.value ? "bg-surface font-semibold text-text shadow-sm" : "text-text-muted"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
