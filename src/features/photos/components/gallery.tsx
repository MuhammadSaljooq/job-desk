"use client"

import { useMemo, useState } from "react"
import { ImageOff, Images, Search } from "lucide-react"
import { cn } from "cn"
import { StagePill } from "@/components/shared/status-pill"
import { EmptyState } from "@/components/shared/empty-state"
import type { JobStage } from "@/lib/status"
import { PHOTO_STAGES, PHOTO_STAGE_LABEL, type PhotoStage } from "../schema"
import { PhotoViewer } from "./photo-viewer"

export type GalleryPhoto = {
  id: string
  stage: PhotoStage
  caption: string | null
  jobId: string | null
  customerId: string
  customerName: string
  createdAt: string
  createdLabel: string
  uploadedBy: string
  openUrl: string | null
  providerLabel: string
}

export type GalleryJob = { id: string; title: string; stage: JobStage; overdue: boolean }

/** Stage badge: After gets the highlighted (white) badge, as in the spec. */
export function StageBadge({ stage }: { stage: PhotoStage }) {
  return (
    <span
      className={cn(
        "absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        stage === "AFTER" ? "bg-surface text-text" : "bg-black/65 text-white"
      )}
    >
      {PHOTO_STAGE_LABEL[stage]}
    </span>
  )
}

export function PhotoTileButton({
  photo,
  onOpen,
  showCustomer,
}: {
  photo: GalleryPhoto
  onOpen: () => void
  showCustomer?: boolean
}) {
  const [failed, setFailed] = useState(false)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-tile bg-surface-muted text-left outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
      aria-label={`${PHOTO_STAGE_LABEL[photo.stage]} photo${photo.caption ? `: ${photo.caption}` : ""}`}
    >
      {failed ? (
        <span className="flex h-full items-center justify-center text-text-subtle">
          <ImageOff className="size-6" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived provider links, not optimizable
        <img
          src={`/api/photos/${photo.id}/file?size=thumb`}
          alt={photo.caption ?? `${PHOTO_STAGE_LABEL[photo.stage]} photo`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      )}
      <StageBadge stage={photo.stage} />
      {(photo.caption || showCustomer) && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3.5 pt-8 pb-3 text-[12.5px] font-semibold text-white">
          {showCustomer && (
            <span className="block text-[11px] font-medium text-white/75">
              {photo.customerName}
            </span>
          )}
          <span className="block truncate">{photo.caption ?? " "}</span>
        </span>
      )}
    </button>
  )
}

/** Filter tabs with counts, caption search, photos grouped by job with its stage pill. */
export function Gallery({
  photos,
  jobs,
  canEdit = true,
  jobOptions,
}: {
  photos: GalleryPhoto[]
  jobs: GalleryJob[]
  canEdit?: boolean
  jobOptions: { id: string; title: string }[]
}) {
  const [stage, setStage] = useState<PhotoStage | "ALL">("ALL")
  const [q, setQ] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: photos.length, BEFORE: 0, DURING: 0, AFTER: 0 }
    for (const p of photos) c[p.stage]++
    return c
  }, [photos])

  const shown = photos.filter(
    (p) =>
      (stage === "ALL" || p.stage === stage) &&
      (!q.trim() || (p.caption ?? "").toLowerCase().includes(q.trim().toLowerCase()))
  )

  const groups = useMemo(() => {
    const byJob = new Map<string, GalleryPhoto[]>()
    for (const p of shown) {
      const key = p.jobId ?? "general"
      byJob.set(key, [...(byJob.get(key) ?? []), p])
    }
    // Inside a job the photos read as a story: Before, During, After, oldest first.
    const stageOrder: Record<PhotoStage, number> = { BEFORE: 0, DURING: 1, AFTER: 2 }
    for (const list of byJob.values()) {
      list.sort(
        (a, b) =>
          stageOrder[a.stage] - stageOrder[b.stage] || a.createdAt.localeCompare(b.createdAt)
      )
    }
    // The job with the newest photo first; General last.
    const newest = (list: GalleryPhoto[]) =>
      list.reduce((m, p) => (p.createdAt > m ? p.createdAt : m), "")
    return [...byJob.entries()].sort((a, b) => {
      if (a[0] === "general") return 1
      if (b[0] === "general") return -1
      return newest(b[1]).localeCompare(newest(a[1]))
    })
  }, [shown])

  const flat = groups.flatMap(([, ps]) => ps)
  const openIndex = flat.findIndex((p) => p.id === openId)

  return (
    <section className="min-w-0 rounded-card bg-surface p-5" aria-label="Job site photos">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter by stage"
          className="scroll-strip max-w-full gap-1! rounded-full bg-surface-muted p-1"
        >
          {(["ALL", ...PHOTO_STAGES] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={stage === s}
              onClick={() => setStage(s)}
              className={cn(
                "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ink",
                stage === s
                  ? "bg-ink font-semibold text-ink-foreground"
                  : "font-medium text-text-muted hover:text-text"
              )}
            >
              {s === "ALL" ? "All" : PHOTO_STAGE_LABEL[s]}
              <span className="text-[11px] opacity-70">{counts[s]}</span>
            </button>
          ))}
        </div>
        <label className="relative flex h-9 w-full items-center sm:w-[260px]">
          <span className="sr-only">Search captions</span>
          <Search className="pointer-events-none absolute left-3 size-4 text-text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search captions"
            className="h-9 w-full rounded-full bg-surface-muted pr-3 pl-9 text-[13px] outline-none placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ink"
          />
        </label>
      </div>

      {photos.length === 0 ? (
        <EmptyState
          icon={<Images />}
          title="No photos yet"
          description="Upload Before, During and After photos to keep a record of the work."
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="No photos match"
          description="Try another stage or caption."
        />
      ) : (
        groups.map(([key, ps]) => {
          const job = jobs.find((j) => j.id === key)
          return (
            <div key={key} className="mt-5">
              <h3 className="mb-3 flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                {job?.title ?? "General"}
                {job && <StagePill stage={job.stage} overdue={job.overdue} />}
                <span className="text-[12.5px] font-normal text-text-muted">
                  {ps.length} photo{ps.length === 1 ? "" : "s"}
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {ps.map((p) => (
                  <PhotoTileButton key={p.id} photo={p} onOpen={() => setOpenId(p.id)} />
                ))}
              </div>
            </div>
          )
        })
      )}

      <PhotoViewer
        photos={flat}
        index={openIndex}
        onIndexChange={(i) => setOpenId(i === null ? null : (flat[i]?.id ?? null))}
        jobOptions={jobOptions}
        canEdit={canEdit}
      />
    </section>
  )
}
