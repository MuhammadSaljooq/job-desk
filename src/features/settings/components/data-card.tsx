"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Database, Loader2, Package, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { clearAllDataAction, reloadSampleDataAction } from "../actions"
import { RowIcon, SettingsCard } from "./field-row"

const rowCls =
  "flex w-full cursor-pointer items-center gap-3 border-b border-divider py-3 text-left outline-none last:border-b-0 focus-visible:ring-2 focus-visible:ring-ink rounded-field"

/** Data (owner only): CSV exports, reload the demo data, and clear everything. */
export function DataCard({ businessName }: { businessName: string }) {
  const router = useRouter()
  const [reload, setReload] = useState(false)
  const [clearing, setClearing] = useState(false)

  return (
    <SettingsCard id="data-title" title="Data" icon={<Database />}>
      <DropdownMenu>
        <DropdownMenuTrigger className={rowCls}>
          <RowIcon>
            <Upload />
          </RowIcon>
          <span className="min-w-0 flex-1">
            <span className="field-label block">Export</span>
            <span className="block truncate text-[14px] font-semibold">
              Customers, jobs and transactions to CSV
            </span>
          </span>
          <ChevronRight className="size-4 text-text-subtle" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {(["customers", "jobs", "transactions"] as const).map((k) => (
            <DropdownMenuItem key={k} asChild>
              <a href={`/api/settings/export?kind=${k}`} download>
                Export {k}
              </a>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button type="button" className={rowCls} onClick={() => setReload(true)}>
        <RowIcon>
          <Package />
        </RowIcon>
        <span className="min-w-0 flex-1">
          <span className="field-label block">Sample data</span>
          <span className="block truncate text-[14px] font-semibold">
            Reload the demo customers and jobs
          </span>
        </span>
        <ChevronRight className="size-4 text-text-subtle" aria-hidden />
      </button>

      <button type="button" className={rowCls} onClick={() => setClearing(true)}>
        <RowIcon tone="danger">
          <Trash2 />
        </RowIcon>
        <span className="min-w-0 flex-1">
          <span className="field-label block">Danger zone</span>
          <span className="block truncate text-[14px] font-semibold text-blush-ink">
            Clear all data
          </span>
        </span>
      </button>

      <ConfirmDialog
        open={reload}
        onOpenChange={setReload}
        title="Reload the sample data?"
        description="The demo customers, jobs, quotes and payments are replaced with fresh ones. Anything you added yourself stays."
        confirmLabel="Reload"
        onConfirm={async () => {
          const res = await reloadSampleDataAction()
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Sample data reloaded")
          setReload(false)
          router.refresh()
        }}
      />
      <ClearAllDialog
        key={clearing ? "open" : "closed"}
        open={clearing}
        onClose={() => setClearing(false)}
        businessName={businessName}
      />
    </SettingsCard>
  )
}

function ClearAllDialog({
  open,
  onClose,
  businessName,
}: {
  open: boolean
  onClose: () => void
  businessName: string
}) {
  const router = useRouter()
  const [typed, setTyped] = useState("")
  const [pending, start] = useTransition()
  const matches = typed.trim() === businessName
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clear all data?</DialogTitle>
          <DialogDescription>
            Deletes every customer, job, quote, payment, expense, activity and catalog item. Your
            team, settings and storage connection stay, and photo files stay in your Drive or
            Dropbox. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!matches) return
            start(async () => {
              const res = await clearAllDataAction(typed)
              if (!res.ok) {
                toast.error(res.error)
                return
              }
              toast.success("All data cleared")
              onClose()
              router.refresh()
            })
          }}
        >
          <label className="grid gap-1.5 text-[13px]">
            <span>
              Type <b className="font-semibold">{businessName}</b> to confirm
            </span>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </label>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="muted" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!matches || pending}>
              {pending && <Loader2 className="animate-spin" />}
              Clear all data
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
