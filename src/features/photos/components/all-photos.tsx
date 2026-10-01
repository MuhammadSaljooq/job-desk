"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Images, Loader2 } from "lucide-react"
import { cn } from "cn"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/shared/empty-state"
import { PHOTO_STAGES, PHOTO_STAGE_LABEL } from "../schema"
import { PhotoTileButton, type GalleryPhoto } from "./gallery"
import { PhotoViewer } from "./photo-viewer"

/** All-photos gallery (rail): filter by customer, stage and date range, all in the URL. */
export function AllPhotos({
  photos,
  customers,
  jobOptionsByCustomer,
}: {
  photos: GalleryPhoto[]
  customers: { id: string; name: string }[]
  jobOptionsByCustomer: Record<string, { id: string; title: string }[]>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const [openId, setOpenId] = useState<string | null>(null)

  const set = (key: string, value: string | null) => {
    const sp = new URLSearchParams(params.toString())
    if (value) sp.set(key, value)
    else sp.delete(key)
    start(() => router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false }))
  }
  const stage = params.get("stage") ?? "ALL"
  const openIndex = photos.findIndex((p) => p.id === openId)
  const open = openIndex >= 0 ? photos[openIndex] : null

  return (
    <section className="rounded-card bg-surface p-5" aria-label="All photos">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[200px] flex-col gap-1.5">
          <label htmlFor="ap-customer" className="text-[12px] font-medium text-text-muted">
            Customer
          </label>
          <Select
            value={params.get("customer") ?? "all"}
            onValueChange={(v) => set("customer", v === "all" ? null : v)}
          >
            <SelectTrigger id="ap-customer" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ap-from" className="text-[12px] font-medium text-text-muted">
            From
          </label>
          <Input
            id="ap-from"
            type="date"
            className="w-40"
            defaultValue={params.get("from") ?? ""}
            onChange={(e) => set("from", e.target.value || null)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ap-to" className="text-[12px] font-medium text-text-muted">
            To
          </label>
          <Input
            id="ap-to"
            type="date"
            className="w-40"
            defaultValue={params.get("to") ?? ""}
            onChange={(e) => set("to", e.target.value || null)}
          />
        </div>
        <div
          role="tablist"
          aria-label="Filter by stage"
          className="flex gap-1 rounded-full bg-surface-muted p-1"
        >
          {(["ALL", ...PHOTO_STAGES] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={stage === s}
              onClick={() => set("stage", s === "ALL" ? null : s)}
              className={cn(
                "h-8 cursor-pointer rounded-full px-4 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ink",
                stage === s
                  ? "bg-ink font-semibold text-ink-foreground"
                  : "font-medium text-text-muted"
              )}
            >
              {s === "ALL" ? "All" : PHOTO_STAGE_LABEL[s]}
            </button>
          ))}
        </div>
        {pending && <Loader2 className="mb-2.5 size-4 animate-spin text-text-muted" />}
      </div>

      {photos.length === 0 ? (
        <EmptyState
          icon={<Images />}
          title="No photos match"
          description="Photos uploaded on any customer's page show up here."
        />
      ) : (
        <>
          <p className="mt-4 mb-3 text-[12.5px] text-text-muted">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
            {photos.length >= 300
              ? " (showing the newest 300; narrow the filters to see more)"
              : ""}
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {photos.map((p) => (
              <PhotoTileButton key={p.id} photo={p} showCustomer onOpen={() => setOpenId(p.id)} />
            ))}
          </div>
        </>
      )}
      <PhotoViewer
        photos={photos}
        index={openIndex}
        onIndexChange={(i) => setOpenId(i === null ? null : (photos[i]?.id ?? null))}
        jobOptions={open ? (jobOptionsByCustomer[open.customerId] ?? []) : []}
        canEdit
      />
    </section>
  )
}
