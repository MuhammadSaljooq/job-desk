"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
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
import { createCustomerAction, updateCustomerAction } from "../actions"
import {
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_LABEL,
  customerSchema,
  type CustomerData,
  type CustomerInput,
} from "../schema"

export type CustomerFormValues = {
  name: string
  type: (typeof CUSTOMER_TYPES)[number]
  phone: string
  email: string
  address: string
  accessNotes: string
  preferredContact: string
  notes: string
  status: "ACTIVE" | "PAST"
}

const EMPTY: CustomerFormValues = {
  name: "",
  type: "HOMEOWNER",
  phone: "",
  email: "",
  address: "",
  accessNotes: "",
  preferredContact: "",
  notes: "",
  status: "ACTIVE",
}

/** New / edit customer (page-spec > Customers list > New customer form). */
export function CustomerDialog({
  open,
  onOpenChange,
  customerId,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** set when editing */
  customerId?: string
  initial?: Partial<CustomerFormValues>
}) {
  const router = useRouter()
  const editing = !!customerId
  const form = useForm<CustomerInput, unknown, CustomerData>({
    resolver: zodResolver(customerSchema),
    defaultValues: { ...EMPTY, ...initial },
  })
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = form

  useEffect(() => {
    if (open) reset({ ...EMPTY, ...initial })
  }, [open, initial, reset])

  const onSubmit = handleSubmit(async (values) => {
    const res = editing
      ? await updateCustomerAction(customerId!, values)
      : await createCustomerAction(values)
    if (!res.ok) {
      for (const [field, message] of Object.entries(res.fieldErrors ?? {})) {
        setError(field as keyof CustomerInput, { message })
      }
      toast.error(res.error)
      return
    }
    onOpenChange(false)
    if (editing) {
      toast.success("Customer details saved")
      router.refresh()
    } else {
      toast.success(`Added ${values.name}`)
      router.push(`/customers/${res.data.id}`)
    }
  })

  const err = (k: keyof CustomerFormValues) => errors[k]?.message as string | undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update their details." : "Name, how to reach them and where the job is."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
            <FormField label="Name or company" htmlFor="c-name" error={err("name")}>
              <Input id="c-name" autoFocus aria-invalid={!!err("name")} {...register("name")} />
            </FormField>
            <FormField label="Type" htmlFor="c-type">
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="c-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {CUSTOMER_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phone" htmlFor="c-phone" error={err("phone")}>
              <Input
                id="c-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                {...register("phone")}
              />
            </FormField>
            <FormField label="Email" htmlFor="c-email" error={err("email")}>
              <Input
                id="c-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                aria-invalid={!!err("email")}
                {...register("email")}
              />
            </FormField>
          </div>
          <FormField label="Job site address" htmlFor="c-address" error={err("address")}>
            <Input id="c-address" autoComplete="street-address" {...register("address")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Access notes"
              htmlFor="c-access"
              hint="Gate code, pets, parking"
              error={err("accessNotes")}
            >
              <Input id="c-access" {...register("accessNotes")} />
            </FormField>
            <FormField
              label="Preferred contact"
              htmlFor="c-pref"
              hint="e.g. Texts, after 5 pm"
              error={err("preferredContact")}
            >
              <Input id="c-pref" {...register("preferredContact")} />
            </FormField>
          </div>
          <FormField label="Notes" htmlFor="c-notes" error={err("notes")}>
            <Textarea id="c-notes" rows={2} {...register("notes")} />
          </FormField>
          {editing && (
            <FormField label="Status" htmlFor="c-status">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="c-status" className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PAST">Past customer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
          <DialogFooter className="gap-2 pt-1 sm:gap-2">
            <Button type="button" variant="muted" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {editing ? "Save changes" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
