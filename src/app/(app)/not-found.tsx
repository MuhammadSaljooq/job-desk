import Link from "next/link"
import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"

export default function NotFound() {
  return (
    <section className="mt-6 rounded-card bg-surface">
      <EmptyState
        icon={<SearchX />}
        title="We couldn't find that"
        description="It may have been deleted, or the link is wrong."
        action={
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        }
      />
    </section>
  )
}
