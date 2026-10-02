"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  Cloud,
  ExternalLink,
  HardDrive,
  Loader2,
  RefreshCw,
  Unplug,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { StatusPill } from "@/components/shared/status-pill"
import { copyPhotosBatchAction, disconnectStorageAction } from "../actions"
import type { SettingsView } from "../queries"
import { RowIcon, SettingsCard } from "./field-row"

const NAME = { GOOGLE_DRIVE: "Google Drive", DROPBOX: "Dropbox", DEV_LOCAL: "Local dev storage" }

const CALLBACK_MESSAGES: Record<string, string> = {
  denied: "Connecting was cancelled.",
  state: "That sign-in link expired. Please try again.",
  user: "Only the owner can connect storage.",
  offline: "The provider didn't allow offline access. Please try again.",
  exchange: "Couldn't finish connecting. Please try again.",
  copying: "Finish copying photos to the current provider before switching again.",
}

/**
 * Storage (owner only): where photos live. Connect / reconnect / disconnect, and switching
 * provider copies photos across in batches with a progress bar (D17). The copy resumes by
 * itself whenever Settings is opened again.
 */
export function StorageCard({ storage }: { storage: SettingsView["storage"] }) {
  const router = useRouter()
  const params = useSearchParams()
  const [confirm, setConfirm] = useState(false)
  const s = storage.status

  // ?storage=connected|error from the OAuth callback
  useEffect(() => {
    const result = params.get("storage")
    if (!result) return
    if (result === "connected") toast.success("Storage connected")
    else if (result === "error")
      toast.error(CALLBACK_MESSAGES[params.get("reason") ?? ""] ?? "Couldn't connect storage.")
    else if (result === "not-configured")
      toast.error("This provider isn't set up yet. Add its app keys to .env first.")
    router.replace("/settings", { scroll: false })
  }, [params, router])

  const connect = (provider: "google" | "dropbox", label: string, primary = false) =>
    storage.configured[provider] ? (
      <Button key={provider} variant={primary ? "default" : "muted"} asChild>
        <a href={`/api/storage/connect/${provider}`}>
          <Cloud /> {label}
        </a>
      </Button>
    ) : (
      <Button
        key={provider}
        variant={primary ? "default" : "muted"}
        disabled
        title="Add the app keys to .env first"
      >
        <Cloud /> {label}
      </Button>
    )

  return (
    <SettingsCard
      id="storage-title"
      title="Photo storage"
      icon={<HardDrive />}
      className="lg:col-span-2 xl:col-span-3"
    >
      {s.state === "connected" ? (
        <div className="flex flex-wrap items-center gap-3">
          <RowIcon>
            <Cloud />
          </RowIcon>
          <div className="min-w-0 flex-[1_1_220px]">
            <p className="field-label">{NAME[s.provider]}</p>
            <p className="truncate text-[14px] font-semibold">{s.accountEmail}</p>
            <p className="text-[12px] text-text-muted">Photos are saved in the JobDesk folder.</p>
          </div>
          <StatusPill tone="mint">Connected</StatusPill>
          {storage.folderUrl && (
            <Button variant="muted" asChild>
              <a href={storage.folderUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Open folder
              </a>
            </Button>
          )}
          {s.provider === "GOOGLE_DRIVE"
            ? connect("dropbox", "Switch to Dropbox")
            : connect("google", "Switch to Google Drive")}
          <Button variant="muted" onClick={() => setConfirm(true)}>
            <Unplug /> Disconnect
          </Button>
        </div>
      ) : s.state === "revoked" ? (
        <div className="flex flex-wrap items-center gap-3">
          <RowIcon tone="danger">
            <AlertTriangle />
          </RowIcon>
          <div className="min-w-0 flex-[1_1_220px]">
            <p className="field-label">{NAME[s.provider]}</p>
            <p className="text-[14px] font-semibold">Access to {s.accountEmail} stopped working</p>
            <p className="text-[12px] text-text-muted">
              Reconnect so photos load and upload again.
            </p>
          </div>
          {connect(s.provider === "GOOGLE_DRIVE" ? "google" : "dropbox", "Reconnect", true)}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <RowIcon>
            <Cloud />
          </RowIcon>
          <div className="min-w-0 flex-[1_1_220px]">
            <p className="text-[14px] font-semibold">
              {s.state === "dev-local" ? "Using local dev storage" : "Not connected yet"}
            </p>
            <p className="text-[12px] text-text-muted">
              Photos are stored only in your own Google Drive or Dropbox, never on our servers.
            </p>
          </div>
          {connect("google", "Connect Google Drive", true)}
          {connect("dropbox", "Connect Dropbox")}
        </div>
      )}

      {storage.copy && <CopyProgress copy={storage.copy} previous={storage.previous} />}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Disconnect storage?"
        description="Your photos stay in your Drive or Dropbox, but JobDesk can't show or upload photos until you connect again."
        confirmLabel="Disconnect"
        onConfirm={async () => {
          const res = await disconnectStorageAction()
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Storage disconnected")
          setConfirm(false)
          router.refresh()
        }}
      />
    </SettingsCard>
  )
}

/** "Copying 34 of 120": runs batch after batch while Settings is open (D17). */
function CopyProgress({
  copy,
  previous,
}: {
  copy: NonNullable<SettingsView["storage"]["copy"]>
  previous: SettingsView["storage"]["previous"]
}) {
  const router = useRouter()
  const [state, setState] = useState({
    remaining: copy.remaining,
    total: copy.total,
    failed: [] as string[],
  })
  const [running, setRunning] = useState(true)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    let cancelled = false
    const failed: string[] = []
    const run = async () => {
      for (;;) {
        const res = await copyPhotosBatchAction(failed)
        if (cancelled) return
        if (!res.ok) {
          toast.error(res.error)
          break
        }
        failed.push(...res.data.failed)
        setState({ remaining: res.data.remaining, total: res.data.total, failed: [...failed] })
        if (res.data.remaining <= failed.length) break
      }
      setRunning(false)
      if (!failed.length) toast.success("All photos copied to the new storage")
      router.refresh()
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [router])

  const done = state.total - state.remaining
  return (
    <div className="mt-4 rounded-field bg-surface-muted p-4" role="status" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-3 text-[13px] font-semibold">
        <span className="flex items-center gap-2">
          {running ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {running
            ? `Copying ${done} of ${state.total} photos${previous ? ` from ${NAME[previous.provider]}` : ""}`
            : `${state.failed.length} photo${state.failed.length === 1 ? "" : "s"} couldn't be copied`}
        </span>
        <span className="tabular text-text-muted">
          {state.total ? Math.round((done / state.total) * 100) : 0}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-divider">
        <div
          className="h-full rounded-full bg-ink transition-[width]"
          style={{ width: `${state.total ? (done / state.total) * 100 : 0}%` }}
        />
      </div>
      <p className="mt-2 text-[12px] text-text-muted">
        {running
          ? "Keep this page open. If you leave, it carries on next time you open Settings."
          : "They stay in the old storage and still show in JobDesk. Open Settings later to try again."}
      </p>
    </div>
  )
}
