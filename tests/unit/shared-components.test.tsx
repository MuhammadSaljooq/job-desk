// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { JobCard } from "@/components/shared/job-card"
import { StagePill, PaymentPill } from "@/components/shared/status-pill"
import { KpiCard } from "@/components/shared/kpi-card"
import { DetailRow } from "@/components/shared/detail-row"
import { EmptyState } from "@/components/shared/empty-state"

describe("JobCard", () => {
  it("shows stage progress, crew and the status chip", () => {
    render(
      <JobCard
        dateLabel="Oct 2, 2026"
        title="Hallway drywall"
        category="Drywall & Paint"
        stage="SCHEDULED"
        assignees={[{ name: "Jordan Reyes" }, { name: "Alex Lin" }]}
        chip="3 days left"
      />
    )
    expect(screen.getByText("Hallway drywall")).toBeInTheDocument()
    expect(screen.getByText("50%")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50")
    expect(screen.getByText("3 days left")).toBeInTheDocument()
    expect(screen.getByText("Assigned: Jordan Reyes, Alex Lin")).toBeInTheDocument()
  })

  it("is drawn blush and says Overdue when late", () => {
    const { container } = render(
      <JobCard
        dateLabel="Sep 27, 2026"
        title="Unit 12 turnover"
        stage="IN_PROGRESS"
        overdue
        assignees={[]}
        chip="2 days late"
      />
    )
    expect(container.firstElementChild?.className).toContain("bg-blush")
    expect(screen.getByText(/Overdue/)).toBeInTheDocument()
    expect(screen.getByText("75%")).toBeInTheDocument()
  })

  it("renders as a link when href is set", () => {
    render(
      <JobCard
        dateLabel="Oct 2"
        title="Job"
        stage="LEAD"
        assignees={[]}
        chip="New lead"
        href="/customers/c1"
      />
    )
    expect(screen.getByRole("link")).toHaveAttribute("href", "/customers/c1")
  })
})

describe("pills and cards", () => {
  it("StagePill labels stages and overdue", () => {
    render(<StagePill stage="IN_PROGRESS" />)
    expect(screen.getByText("In progress")).toBeInTheDocument()
  })
  it("PaymentPill shows 'None yet' as muted text", () => {
    render(<PaymentPill status="NONE" />)
    expect(screen.getByText("None yet").className).toContain("text-text-subtle")
  })
  it("KpiCard renders label, value and caption", () => {
    render(<KpiCard label="Revenue" value="$938.04" caption="3 payments" tone="mint" />)
    expect(screen.getByText("$938.04")).toBeInTheDocument()
    expect(screen.getByText("3 payments")).toBeInTheDocument()
  })
  it("DetailRow shows 'Not set' for an empty value", () => {
    render(<DetailRow icon={null} label="Email address" value="" />)
    expect(screen.getByText("Not set")).toBeInTheDocument()
  })
  it("EmptyState shows its title and action", () => {
    render(<EmptyState title="No customers yet" action={<button>Add</button>} />)
    expect(screen.getByText("No customers yet")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument()
  })
})
