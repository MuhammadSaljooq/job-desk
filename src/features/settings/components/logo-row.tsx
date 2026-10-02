"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { sendFile } from "@/features/photos/components/upload-card"
import { removeLogoAction, saveLogoAction, startLogoUploadAction } from "../actions"
import { RowIcon } from "./field-row"

/** A small copy for quotes and the header (D15): at most 400px, ~30 KB, as a data URL. */
async function thumbnail(file: File): Promise<string> {
  const { default: imageCompression } = await import("browser-image-compression")
  const small = await imageCompression(file, {
    maxWidthOrHeight: 400,
    maxSizeMB: 0.03,
    useWebWorker: true,
    fileType: file.type === "image/png" ? "image/png" : "image/jpeg",
  })
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error("Couldn't read the image"))
    r.readAsDataURL(small)
  })
}

/** Business profile > Logo: the original goes to Drive / Dropbox, the small copy to the DB. */
export function LogoRow({
  hasLogo,
  version,
  readOnly,
}: {
  hasLogo: boolean
  version: number
  readOnly: boolean
}) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [, start] = useTransition()

  const upload = async (file: File) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      toast.error("Use a PNG, JPG or WebP image for the logo.")
      return
    }
    setBusy(true)
    try {
      const thumb = await thumbnail(file)
      const session = await startLogoUploadAction({ mimeType: file.type, size: file.size })
      if (!session.ok) throw new Error(session.error)
      let response: unknown = null
      if (session.data.upload) response = await sendFile(session.data.upload, file, () => {})
      const saved = await saveLogoAction({ thumb, token: session.data.token, response })
      if (!saved.ok) throw new Error(saved.error)
      toast.success(
        session.data.upload ? "Logo saved" : "Logo saved. Connect storage to keep the original."
      )
      start(() => router.refresh())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the logo.")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      {hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny private image from our API
        <img
          src={`/api/settings/logo?v=${version}`}
          alt="Business logo"
          className="size-9 shrink-0 rounded-full bg-surface-muted object-cover"
        />
      ) : (
        <RowIcon>
          <ImageIcon />
        </RowIcon>
      )}
      <div className="min-w-0 flex-1">
        <p className="field-label">Logo</p>
        <p className="truncate text-[14px] font-semibold">
          {hasLogo ? "Shown on your quotes" : "Upload a square logo"}
        </p>
      </div>
      {!readOnly && (
        <>
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Logo file"
            onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
          />
          {hasLogo && (
            <button
              type="button"
              aria-label="Remove logo"
              disabled={busy}
              onClick={async () => {
                const res = await removeLogoAction()
                if (!res.ok) toast.error(res.error)
                else start(() => router.refresh())
              }}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-text-subtle hover:bg-surface-muted hover:text-text"
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button
            type="button"
            aria-label={hasLogo ? "Replace logo" : "Upload logo"}
            disabled={busy}
            onClick={() => input.current?.click()}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-text-subtle hover:bg-surface-muted hover:text-text"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          </button>
        </>
      )}
    </div>
  )
}
