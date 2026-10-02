"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoundButton } from "@/components/shared/round-button"
import { RowAction } from "@/components/shared/detail-row"
import type { CustomerFormValues } from "./customer-dialog"
import type { JobFormValues, TeamOption } from "@/features/jobs/components/job-dialog"
import dynamic from "next/dynamic"
import { useLazyDialog } from "@/lib/use-lazy-dialog"

// Loaded on first open (form code + zod stay off the page's first load).
const loadCustomerDialog = () => import("./customer-dialog")
const loadJobDialog = () => import("@/features/jobs/components/job-dialog")
const CustomerDialog = dynamic(() => loadCustomerDialog().then((m) => m.CustomerDialog))
const JobDialog = dynamic(() => loadJobDialog().then((m) => m.JobDialog))

type EditableJob = { id: string } & Partial<JobFormValues>

type Ctx = {
  editCustomer: () => void
  newJob: (date?: string) => void
  editJob: (job: EditableJob) => void
}

const ProfileDialogsContext = createContext<Ctx | null>(null)

export function useProfileDialogs() {
  const ctx = useContext(ProfileDialogsContext)
  if (!ctx) throw new Error("useProfileDialogs must be used inside <ProfileDialogs>")
  return ctx
}

/** Holds the edit-customer and job dialogs for a customer profile. Opens on ?edit=1 / ?new=job. */
export function ProfileDialogs({
  customerId,
  customer,
  team,
  children,
}: {
  customerId: string
  customer: CustomerFormValues
  team: TeamOption[]
  children: React.ReactNode
}) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [editState, setEditState] = useState(false)
  const [jobState, setJobState] = useState(false)
  const [job, setJob] = useState<EditableJob | null>(null)
  const [jobDate, setJobDate] = useState<string | undefined>()

  // ?edit=1 (from a customer card) and ?new=job (from + New) open the dialogs via the URL.
  const editFromUrl = params.get("edit") === "1"
  const jobFromUrl = params.get("new") === "job"
  const clearUrl = () => {
    if (!editFromUrl && !jobFromUrl) return
    const sp = new URLSearchParams(params.toString())
    sp.delete("edit")
    sp.delete("new")
    router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false })
  }
  const editOpen = editState || editFromUrl
  const jobOpen = jobState || jobFromUrl
  const setEditOpen = (o: boolean) => {
    setEditState(o)
    if (!o) clearUrl()
  }
  const setJobOpen = (o: boolean) => {
    setJobState(o)
    if (!o) clearUrl()
  }

  const editCustomer = useCallback(() => setEditState(true), [])
  const newJob = useCallback((date?: string) => {
    setJob(null)
    setJobDate(date)
    setJobState(true)
  }, [])
  const editJob = useCallback((j: EditableJob) => {
    setJob(j)
    setJobState(true)
  }, [])
  const value = useMemo(() => ({ editCustomer, newJob, editJob }), [editCustomer, newJob, editJob])
  const showEdit = useLazyDialog(editOpen, loadCustomerDialog)
  const showJob = useLazyDialog(jobOpen, loadJobDialog)

  return (
    <ProfileDialogsContext.Provider value={value}>
      {children}
      {showEdit && (
        <CustomerDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          customerId={customerId}
          initial={customer}
        />
      )}
      {showJob && (
        <JobDialog
          open={jobOpen}
          onOpenChange={setJobOpen}
          jobId={job?.id}
          initial={
            job
              ? { ...job, customerId }
              : { customerId, date: jobDate ?? "", stage: jobDate ? "SCHEDULED" : "LEAD" }
          }
          team={team}
        />
      )}
    </ProfileDialogsContext.Provider>
  )
}

export function EditCustomerButton({ variant = "row" }: { variant?: "row" | "pill" }) {
  const { editCustomer } = useProfileDialogs()
  return variant === "pill" ? (
    <Button variant="secondary" onClick={editCustomer}>
      <Pencil /> Edit details
    </Button>
  ) : (
    <RowAction label="Edit details" onClick={editCustomer}>
      <Pencil />
    </RowAction>
  )
}

export function NewJobButton({ variant = "round" }: { variant?: "round" | "pill" }) {
  const { newJob } = useProfileDialogs()
  return variant === "pill" ? (
    <Button onClick={() => newJob()}>
      <Plus /> Job
    </Button>
  ) : (
    <RoundButton label="Add job" white size="sm" onClick={() => newJob()}>
      <Plus />
    </RoundButton>
  )
}
