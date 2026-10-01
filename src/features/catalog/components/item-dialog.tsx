"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { CATALOG_UNITS } from "../sample-catalog"
import { createItemAction, updateItemAction } from "../actions"
import { itemSchema, type ItemInput } from "../schema"

export type ItemFormValues = {
  name: string
  category: string
  unit: (typeof CATALOG_UNITS)[number]
}

/** Add / edit item: name, category (pick or type new), unit. No price, by design. */
export function ItemDialog({
  open,
  onOpenChange,
  itemId,
  initial,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId?: string
  initial?: Partial<ItemFormValues>
  categories: string[]
}) {
  const router = useRouter()
  const editing = !!itemId
  const defaults: ItemFormValues = {
    name: "",
    category: categories[0] ?? "",
    unit: "each",
    ...initial,
  }
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ItemInput>({ resolver: zodResolver(itemSchema), defaultValues: defaults })

  useEffect(() => {
    if (open) reset(defaults)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when (re)opened
  }, [open])

  const onSubmit = handleSubmit(async (values) => {
    const res = editing ? await updateItemAction(itemId!, values) : await createItemAction(values)
    if (!res.ok) {
      for (const [field, message] of Object.entries(res.fieldErrors ?? {})) {
        setError(field as keyof ItemInput, { message })
      }
      if (!res.fieldErrors) setError("name", { message: res.error })
      toast.error(res.error)
      return
    }
    toast.success(editing ? "Item saved" : `Added ${values.name}`)
    onOpenChange(false)
    router.refresh()
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>
            Prices aren&apos;t stored here. You type the price on each quote.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField label="Item or service" htmlFor="i-name" error={errors.name?.message}>
            <Input id="i-name" autoFocus aria-invalid={!!errors.name} {...register("name")} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_150px]">
            <FormField
              label="Category"
              htmlFor="i-category"
              error={errors.category?.message}
              hint="Pick one or type a new category"
            >
              <Input
                id="i-category"
                list="catalog-categories"
                aria-invalid={!!errors.category}
                {...register("category")}
              />
              <datalist id="catalog-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Unit" htmlFor="i-unit">
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="i-unit" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATALOG_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <DialogFooter className="gap-2 pt-1 sm:gap-2">
            <Button type="button" variant="muted" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {editing ? "Save item" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
