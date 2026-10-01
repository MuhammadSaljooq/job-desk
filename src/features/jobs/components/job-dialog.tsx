"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormField } from "@/components/shared/form-field"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import { JOB_STAGES, STAGE_META, type JobStage } from "@/lib/status"
import { createJobAction, updateJobAction } from "../actions"
import { JOB_CATEGORIES, jobSchema, type JobData, type JobInput } from "../schema"

export type TeamOption = { id: string; name: string; avatarColor: string; title?: string | null }
export type CustomerOption = { id: string; name: string }

export type JobFormValues = {
  customerId: string
  title: string
  category: string
  stage: JobStage
  date: string
  time: string
  assigneeIds: string[]
  notes: string
}

/** New / edit job. Customer is fixed on a profile, or picked when opened from + New. */
export function JobDialog({
  open,
  onOpenChange,
  jobId,
  initial,
  team,
  customers,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId?: string
  initial: Partial<JobFormValues> & { customerId?: string }
  team: TeamOption[]
  /** when given, a customer picker is shown */
  customers?: CustomerOption[]
  onSaved?: (job: { id: string; customerId: string }) => void
}) {
  const router = useRouter()
  const editing = !!jobId
  const defaults: JobFormValues = {
    customerId: "",
    title: "",
    category: "",
    stage: "LEAD",
    date: "",
    time: "",
    assigneeIds: [],
    notes: "",
    ...initial,
  }
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<JobInput, unknown, JobData>({
    resolver: zodResolver(jobSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (open) reset(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when (re)opened
  }, [open])

  const onSubmit = handleSubmit(async (values) => {
    const res = editing ? await updateJobAction(jobId!, values) : await createJobAction(values)
    if (!res.ok) {
      for (const [field, message] of Object.entries(res.fieldErrors ?? {})) {
        setError(field as keyof JobInput, { message })
      }
      toast.error(res.error)
      return
    }
    toast.success(editing ? "Job saved" : `Added ${values.title}`)
    onOpenChange(false)
    onSaved?.({ id: res.data.id, customerId: values.customerId })
    router.refresh()
  })

  const err = (k: keyof JobFormValues) => errors[k]?.message as string | undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit job" : "New job"}</DialogTitle>
          <DialogDescription>
            {editing ? "Change the details, date or crew." : "What, when and who's going."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          {customers && !editing && (
            <FormField label="Customer" htmlFor="j-customer" error={err("customerId")}>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="j-customer"
                      className="w-full"
                      aria-invalid={!!err("customerId")}
                    >
                      <SelectValue placeholder="Pick a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
          <FormField label="Job title" htmlFor="j-title" error={err("title")}>
            <Input
              id="j-title"
              autoFocus
              placeholder="e.g. Hallway drywall and paint"
              aria-invalid={!!err("title")}
              {...register("title")}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category" htmlFor="j-category" error={err("category")}>
              <Input id="j-category" list="job-categories" {...register("category")} />
              <datalist id="job-categories">
                {JOB_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Stage" htmlFor="j-stage">
              <Controller
                control={control}
                name="stage"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="j-stage" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STAGE_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" htmlFor="j-date" error={err("date")}>
              <Input id="j-date" type="date" aria-invalid={!!err("date")} {...register("date")} />
            </FormField>
            <FormField label="Time" htmlFor="j-time" error={err("time")} hint="Defaults to 9:00 am">
              <Input id="j-time" type="time" step={900} {...register("time")} />
            </FormField>
          </div>
          {team.length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-[12px] font-medium text-text-muted">Crew</legend>
              <Controller
                control={control}
                name="assigneeIds"
                render={({ field }) => {
                  const value = field.value ?? []
                  return (
                    <div className="flex flex-wrap gap-2">
                      {team.map((m) => {
                        const on = value.includes(m.id)
                        return (
                          <button
                            key={m.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              field.onChange(
                                on ? value.filter((v) => v !== m.id) : [...value, m.id]
                              )
                            }
                            className={cn(
                              "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full pr-3.5 pl-1 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ink",
                              on ? "bg-ink text-ink-foreground" : "bg-surface-muted text-text"
                            )}
                          >
                            <InitialsAvatar
                              name={m.name}
                              color={m.avatarColor}
                              size="xs"
                              className="size-7"
                            />
                            {m.name.split(" ")[0]}
                            {on && <Check className="size-3.5" />}
                          </button>
                        )
                      })}
                    </div>
                  )
                }}
              />
            </fieldset>
          )}
          <FormField label="Notes" htmlFor="j-notes" error={err("notes")}>
            <Textarea
              id="j-notes"
              rows={2}
              placeholder="Materials, access, anything to remember"
              {...register("notes")}
            />
          </FormField>
          <DialogFooter className="gap-2 pt-1 sm:gap-2">
            <Button type="button" variant="muted" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {editing ? "Save job" : "Add job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
