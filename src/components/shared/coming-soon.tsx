import { Hammer } from "lucide-react"
import { EmptyState } from "./empty-state"

/** Placeholder body for routes that later phases fill in. */
export function ComingSoon({ phase, what }: { phase: number; what: string }) {
  return (
    <section className="rounded-card bg-surface">
      <EmptyState
        icon={<Hammer />}
        title={`${what} arrives in phase ${phase}`}
        description="The page is wired into navigation so you can click through the app end to end."
      />
    </section>
  )
}
