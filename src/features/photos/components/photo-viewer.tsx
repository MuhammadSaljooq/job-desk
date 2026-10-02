"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { FormField } from "@/components/shared/form-field"
import { deletePhotoAction, updatePhotoAction } from "../actions"
import { PHOTO_STAGES, PHOTO_STAGE_LABEL, type PhotoStage } from "../constants"
import type { GalleryPhoto } from "./gallery"

/** Large image, edit caption / stage / job, delete, open in Drive / Dropbox, ← → keys. */
export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  jobOptions,
  canEdit,
}: {
  photos: GalleryPhoto[]
  index: number
  onIndexChange: (i: number | null) => void
  jobOptions: { id: string; title: string }[]
  canEdit: boolean
}) {
  const router = useRouter()
  const photo = index >= 0 ? photos[index] : null
  const [caption, setCaption] = useState("")
  const [stage, setStage] = useState<PhotoStage>("BEFORE")
  const [jobId, setJobId] = useState("general")
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  const [shownId, setShownId] = useState<string | null>(null)

  // Load the fields when a different photo is shown (state reset keyed by photo id).
  if (photo && photo.id !== shownId) {
    setShownId(photo.id)
    setCaption(photo.caption ?? "")
    setStage(photo.stage)
    setJobId(photo.jobId ?? "general")
  }

  useEffect(() => {
    if (!photo) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return
      if (e.key === "ArrowRight" && index < photos.length - 1) onIndexChange(index + 1)
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [photo, index, photos.length, onIndexChange])

  const dirty =
    !!photo &&
    (caption.trim() !== (photo.caption ?? "") ||
      stage !== photo.stage ||
      jobId !== (photo.jobId ?? "general"))

  const save = () =>
    start(async () => {
      if (!photo) return
      const res = await updatePhotoAction(photo.id, {
        caption,
        stage,
        jobId: jobId === "general" ? null : jobId,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(
        stage !== photo.stage || jobId !== (photo.jobId ?? "general")
          ? "Photo moved and saved"
          : "Caption saved"
      )
      router.refresh()
    })

  return (
    <>
      <Dialog open={!!photo} onOpenChange={(o) => !o && onIndexChange(null)}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] gap-0 p-0 sm:max-w-4xl">
          {photo && (
            <div className="grid md:grid-cols-[minmax(0,1fr)_280px]">
              <div className="relative flex min-h-[260px] items-center justify-center bg-black md:rounded-l-card">
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived provider link */}
                <img
                  key={photo.id}
                  src={`/api/photos/${photo.id}/file?size=full`}
                  alt={photo.caption ?? `${PHOTO_STAGE_LABEL[photo.stage]} photo`}
                  className="max-h-[70dvh] w-full object-contain"
                />
                {index > 0 && (
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => onIndexChange(index - 1)}
                    className="absolute top-1/2 left-3 inline-flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-text"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                )}
                {index < photos.length - 1 && (
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => onIndexChange(index + 1)}
                    className="absolute top-1/2 right-3 inline-flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-text"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-4 p-5">
                <div>
                  <DialogTitle>
                    {photo.caption ?? `${PHOTO_STAGE_LABEL[photo.stage]} photo`}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-[12px] text-text-muted">
                    {photo.customerName} · Added {photo.createdLabel} by {photo.uploadedBy} ·{" "}
                    {index + 1} of {photos.length}
                  </DialogDescription>
                </div>
                <FormField label="Caption" htmlFor="pv-caption">
                  <Input
                    id="pv-caption"
                    value={caption}
                    maxLength={140}
                    disabled={!canEdit}
                    placeholder="e.g. Patch set, ready for paint"
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </FormField>
                <div>
                  <p className="mb-1.5 text-[12px] font-medium text-text-muted">Stage</p>
                  <div
                    role="radiogroup"
                    aria-label="Stage"
                    className="inline-flex rounded-full bg-surface-muted p-1"
                  >
                    {PHOTO_STAGES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={stage === s}
                        disabled={!canEdit}
                        onClick={() => setStage(s)}
                        className={cn(
                          "h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink",
                          stage === s ? "bg-surface font-semibold shadow-sm" : "text-text-muted"
                        )}
                      >
                        {PHOTO_STAGE_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <FormField label="Job" htmlFor="pv-job">
                  <Select value={jobId} onValueChange={setJobId} disabled={!canEdit}>
                    <SelectTrigger id="pv-job" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {jobOptions.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.title}
                        </SelectItem>
                      ))}
                      <SelectItem value="general">General (no job)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <div className="mt-auto flex flex-wrap gap-2">
                  {canEdit && (
                    <Button onClick={save} disabled={!dirty || pending}>
                      {pending && <Loader2 className="animate-spin" />} Save
                    </Button>
                  )}
                  {photo.openUrl && (
                    <Button variant="muted" asChild>
                      <a href={photo.openUrl} target="_blank" rel="noreferrer">
                        <ExternalLink /> Open in {photo.providerLabel}
                      </a>
                    </Button>
                  )}
                  {canEdit && (
                    <Button
                      variant="destructive"
                      onClick={() => setConfirm(true)}
                      aria-label="Delete photo"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this photo?"
        description={`It's also deleted from ${photo?.providerLabel ?? "storage"}. This can't be undone.`}
        confirmLabel="Delete photo"
        onConfirm={async () => {
          if (!photo) return
          const res = await deletePhotoAction(photo.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Photo deleted")
          onIndexChange(photos.length > 1 ? Math.max(0, Math.min(index, photos.length - 2)) : null)
          router.refresh()
        }}
      />
    </>
  )
}
