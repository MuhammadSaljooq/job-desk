"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Breadcrumb } from "@/components/shell/breadcrumb"
import { CustomersToolbar } from "./customers-toolbar"
import type { CustomerOption, TeamOption } from "@/features/jobs/components/job-dialog"
import dynamic from "next/dynamic"
import { useLazyDialog } from "@/lib/use-lazy-dialog"

// Loaded on first open (form code + zod stay off the page's first load).
const loadCustomerDialog = () => import("./customer-dialog")
const loadJobDialog = () => import("@/features/jobs/components/job-dialog")
const CustomerDialog = dynamic(() => loadCustomerDialog().then((m) => m.CustomerDialog))
const JobDialog = dynamic(() => loadJobDialog().then((m) => m.JobDialog))

/**
 * Breadcrumb + the dialogs the customers page can open, including from the + New menu
 * (?new=customer, ?new=job).
 */
export function CustomersPageClient({
  team,
  customers,
}: {
  team: TeamOption[]
  customers: CustomerOption[]
}) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [customerOpen, setCustomerOpen] = useState(false)
  const [jobOpen, setJobOpen] = useState(false)
  // The + New menu links here with ?new=customer / ?new=job: the URL opens the dialog.
  const fromUrl = params.get("new")
  const clearUrl = () => {
    if (!fromUrl) return
    const sp = new URLSearchParams(params.toString())
    sp.delete("new")
    router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false })
  }
  const newCustomer = customerOpen || fromUrl === "customer"
  const newJob = jobOpen || fromUrl === "job"
  const showCustomer = useLazyDialog(newCustomer, loadCustomerDialog)
  const showJob = useLazyDialog(newJob, loadJobDialog)
  const setNewCustomer = (o: boolean) => {
    setCustomerOpen(o)
    if (!o) clearUrl()
  }
  const setNewJob = (o: boolean) => {
    setJobOpen(o)
    if (!o) clearUrl()
  }

  return (
    <>
      <Breadcrumb title="Customers">
        <CustomersToolbar onNew={() => setNewCustomer(true)} />
      </Breadcrumb>
      {showCustomer && <CustomerDialog open={newCustomer} onOpenChange={setNewCustomer} />}
      {showJob && (
        <JobDialog
          open={newJob}
          onOpenChange={setNewJob}
          initial={{}}
          team={team}
          customers={customers}
          onSaved={(j) => router.push(`/customers/${j.customerId}?job=${j.id}`)}
        />
      )}
    </>
  )
}
