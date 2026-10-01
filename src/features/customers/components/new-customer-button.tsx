"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Opens the new-customer dialog via the page's ?new=customer handler. */
export function NewCustomerButton({ label = "Add customer" }: { label?: string }) {
  return (
    <Button asChild>
      <Link href="/customers?new=customer" scroll={false}>
        <Plus /> {label}
      </Link>
    </Button>
  )
}
