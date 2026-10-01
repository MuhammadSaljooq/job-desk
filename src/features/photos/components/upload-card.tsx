"use client"

import { useId, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Camera, CheckCircle2, CircleAlert, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { savePhotosAction } from "../actions"
import { PHOTO_STAGES, PHOTO_STAGE_LABEL, type PhotoStage } from "../schema"

export type StorageState = "connected" | "dev-local" | "none" | "revoked"

type Item = {
  key: string
  name: string
  progress: number
  status: "waiting" | "compressing" | "uploading" | "done" | "error"
  error?: string
}

const MAX_BYTES = 15 * 1024 * 1024

/** Shrink to max 1600px at ~0.75 quality before upload (photos stay small in Drive/Dropbox). */
async function compress(file: File): Promise<File> {
  const { default: imageCompression } = await import("browser-image-compression")
  if (file.type === "image/gif") return file
  try {
    return await imageCompression(file, {
      maxWidthOrHeight: 1600,
      initialQuality: 0.75,
      maxSizeMB: 2,
      useWebWorker: true,
      fileType: file.type === "image/png" ? "image/png" : "image/jpeg",
    })
  } catch {
    return file // e.g. HEIC the browser can't decode: upload the original
  }
}

async function dimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  try {
    const bmp = await createImageBitmap(file)
    const d = { width: bmp.width, height: bmp.height }
    bmp.close()
    return d
  } catch {
    return { width: null, height: null }
  }
}

/** PUT/POST the bytes straight to the provider with progress; resolves with its JSON reply. */
function sendFile(
  target: { url: string; method: string; headers: Record<string, string> },
  file: File,
  onProgress: (p: number) => void
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(target.method, target.url)
    for (const [k, v] of Object.entries(target.headers)) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {})
        } catch {
          resolve({})
        }
      } else reject(new Error(`Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error("Network error during upload"))
    xhr.send(file)
  })
}

/** Upload photos (shot-photos.png): attach to job, Before/During/After, drop zone / camera. */
export function UploadCard({
  customerId,
  jobs,
  defaultJobId,
  storage,
  isOwner,
}: {
  customerId: string
  jobs: { id: string; title: string }[]
  defaultJobId?: string | null
  storage: StorageState
  isOwner: boolean
}) {
  const router = useRouter()
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [jobId, setJobId] = useState<string>(defaultJobId ?? jobs[0]?.id ?? "general")
  const [stage, setStage] = useState<PhotoStage>("BEFORE")
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)

  const update = (key: string, patch: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  async function handle(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (!list.length) {
      toast.error("Choose photos (JPEG, PNG, WebP or HEIC).")
      return
    }
    if (list.length > 30) {
      toast.error("Upload up to 30 photos at a time.")
      return
    }
    setBusy(true)
    const queued: Item[] = list.map((f, i) => ({
      key: `${Date.now()}-${i}`,
      name: f.name,
      progress: 0,
      status: "waiting",
    }))
    setItems(queued)
    const done: {
      token: string
      response: unknown
      width: number | null
      height: number | null
    }[] = []

    for (const [i, original] of list.entries()) {
      const key = queued[i].key
      try {
        update(key, { status: "compressing" })
        const file = await compress(original)
        if (file.size > MAX_BYTES) throw new Error("Larger than 15 MB")
        const dims = await dimensions(file)
        const res = await fetch("/api/storage/upload-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            jobId: jobId === "general" ? null : jobId,
            stage,
            mimeType: file.type || "image/jpeg",
            size: file.size,
          }),
        })
        const session = await res.json()
        if (!res.ok) throw new Error(session.error ?? "Couldn't start the upload")
        update(key, { status: "uploading" })
        const response = await sendFile(session.upload, file, (p) => update(key, { progress: p }))
        done.push({ token: session.token, response, ...dims })
        update(key, { status: "done", progress: 1 })
      } catch (err) {
        update(key, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        })
      }
    }

    if (done.length) {
      const saved = await savePhotosAction({ items: done })
      if (saved.ok) {
        toast.success(
          `${saved.data.count} photo${saved.data.count === 1 ? "" : "s"} added to ${PHOTO_STAGE_LABEL[stage]}`
        )
        router.refresh()
      } else {
        toast.error(saved.error)
      }
    }
    if (done.length < list.length)
      toast.error(`${list.length - done.length} photo(s) didn't upload. See the list.`)
    setBusy(false)
    if (input.current) input.current.value = ""
  }

  const blocked = storage === "none" || storage === "revoked"

  return (
    <section className="min-w-0 rounded-card bg-surface p-5" aria-labelledby={`${inputId}-title`}>
      <header className="mb-3 flex min-h-8 items-center justify-between">
        <h2 id={`${inputId}-title`} className="text-[16px] font-semibold">
          Upload photos
        </h2>
        <Camera className="size-4 text-text-muted" aria-hidden />
      </header>

      {blocked ? (
        <div className="rounded-[16px] bg-surface-muted p-4 text-[13px] text-text">
          {storage === "revoked" ? (
            <p className="mb-3 font-semibold text-blush-ink">Photo storage was disconnected.</p>
          ) : (
            <p className="mb-3 text-text-muted">
              Photos are saved to your own Google Drive or Dropbox, sorted into customer and job
              folders.
            </p>
          )}
          {isOwner ? (
            <div className="flex flex-wrap gap-2">
              {/* Full-page navigation on purpose: <Link> would prefetch the OAuth redirect. */}
              <Button asChild size="sm">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/api/storage/connect/google">
                  {storage === "revoked" ? "Reconnect" : "Connect"} Google Drive
                </a>
              </Button>
              <Button asChild size="sm" variant="muted">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/api/storage/connect/dropbox">
                  {storage === "revoked" ? "Reconnect" : "Connect"} Dropbox
                </a>
              </Button>
            </div>
          ) : (
            <p className="font-semibold">Ask the owner to connect storage in Settings.</p>
          )}
        </div>
      ) : (
        <>
          <label className="field-label" htmlFor={`${inputId}-job`}>
            Attach to job
          </label>
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger id={`${inputId}-job`} className="mt-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.title}
                </SelectItem>
              ))}
              <SelectItem value="general">General (no job)</SelectItem>
            </SelectContent>
          </Select>

          <p className="field-label mt-4">Stage</p>
          <div
            role="radiogroup"
            aria-label="Stage"
            className="mt-1.5 inline-flex rounded-full bg-surface-muted p-1"
          >
            {PHOTO_STAGES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={stage === s}
                onClick={() => setStage(s)}
                className={cn(
                  "h-8 cursor-pointer rounded-full px-4 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink",
                  stage === s ? "bg-surface font-semibold text-text shadow-sm" : "text-text-muted"
                )}
              >
                {PHOTO_STAGE_LABEL[s]}
              </button>
            ))}
          </div>

          <label
            htmlFor={`${inputId}-files`}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              if (!busy) void handle(e.dataTransfer.files)
            }}
            className={cn(
              "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[16px] border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-ink",
              over ? "border-ink bg-surface-muted" : "border-divider hover:bg-surface-muted",
              busy && "pointer-events-none opacity-60"
            )}
          >
            {busy ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <Upload className="size-6" strokeWidth={1.75} />
            )}
            <span className="mt-2 text-[14px] font-semibold">Drop photos or tap to upload</span>
            <span className="mt-1 text-[12px] text-text-muted">
              Opens the camera on a phone. Resized automatically.
            </span>
            <input
              ref={input}
              id={`${inputId}-files`}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              disabled={busy}
              className="sr-only"
              onChange={(e) => e.target.files && void handle(e.target.files)}
            />
          </label>

          {storage === "dev-local" && (
            <p className="mt-3 text-[11.5px] text-text-subtle">
              Development storage: photos are saved on this computer until Google Drive or Dropbox
              is connected
              {isOwner ? (
                <>
                  {" "}
                  in{" "}
                  <Link href="/settings" className="underline">
                    Settings
                  </Link>
                </>
              ) : null}
              .
            </p>
          )}

          {items.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5" aria-label="Upload progress">
              {items.map((i) => (
                <li key={i.key} className="flex items-center gap-2 text-[12.5px]">
                  {i.status === "done" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-mint-ink" />
                  ) : i.status === "error" ? (
                    <CircleAlert className="size-4 shrink-0 text-blush-ink" />
                  ) : (
                    <Loader2 className="size-4 shrink-0 animate-spin text-text-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{i.name}</span>
                  {i.status === "error" ? (
                    <span className="text-blush-ink">{i.error}</span>
                  ) : (
                    <span className="w-20 shrink-0">
                      <span className="block h-1 overflow-hidden rounded-full bg-surface-muted">
                        <span
                          className="block h-full rounded-full bg-ink transition-[width]"
                          style={{
                            width: `${Math.round((i.status === "compressing" ? 0.05 : i.progress) * 100)}%`,
                          }}
                        />
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
