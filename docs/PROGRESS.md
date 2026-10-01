# Progress

## Setup (2026-10-01)

Done:

- Copied the starter kit into the repo.
- Exported the two Claude Docs to markdown:
  - `docs/page-spec.md` from https://claude.ai/artifact/Ccs8JuaVmH1YyY7ghKMP7X
  - `docs/client-overview.md` from https://claude.ai/artifact/2Bia5k1fiDPUJ34k1W46QY
- Replaced the PDF references in README and the prompts with these files.
- Rebuilt `CLAUDE.md`:
  - It merges the original from the "JobDesk Build Kit for Claude Code" Claude Doc
    (https://claude.ai/artifact/KwPw9PTCSnaxBDPzJn6hat) with colours sampled from
    `docs/screens/`.
  - Sizes are converted from screenshot pixels to CSS pixels (the screenshots are 1440px
    captured at 1.25×).
- Wrote `docs/seed-data.md` with the 44-item sample catalog and sample records, built from the POC plus
  the screenshots.
- Saved the POC as `docs/reference/poc-field-service-workspace.html`
  (https://claude.ai/artifact/LdKaGofBKfV1YwfiTen8UB).

## Phase 0: plan (2026-10-01)

- Wrote `docs/PLAN.md`:
  - a product summary
  - 15 routes with their components
  - the Prisma data model
  - the 12 phases
  - decisions D1–D21 (section 5)
- Resolved all 21 open questions with the user. Main choices:
  - keep team features
  - owner-created staff accounts
  - in-app notifications only
  - Dylan sends quote PDFs himself
  - block quotes that have unpriced lines
  - one date per job
  - a business timezone setting
  - bcryptjs for password hashing
  - latest stable Next.js, if every library supports it
- Still waiting on Dylan:
  - his Excel item list
  - business name, logo, address, tax rate and timezone
  - who on the team will use the system
- Hosting (D21) gets decided before phase 11.

## Phase 1: scaffold and design system (2026-10-01)

- Versions checked against npm and Context7 (D20):
  - Next.js 16.3.8 (Turbopack), React 19.2.8 (the version Next 16.3.8 ships with)
  - TypeScript 6.0.3: TS 7 isn't supported by typescript-eslint yet
  - Tailwind 4.3, shadcn 4.21 (Radix base, "nova" preset)
  - Vitest 5, Playwright 1.63
  - Planned for phase 2: Prisma 7.10 (stable; the npm "latest" tag points at an 8.0 RC) and
    Auth.js 5.0.0-beta.32 (it supports Next 16)
- Next 16 differences to remember:
  - `middleware.ts` is now `proxy.ts` and runs on Node.
  - `next lint` is gone (ESLint runs directly).
  - `typecheck` runs `next typegen` first, which generates the route types (`LayoutProps` and so on).
- shadcn 4 replaced the old `Form` with `Field`, so forms use React Hook Form `Controller` plus
  Field. It also brought `next-themes` (used for Match device / Light / Dark through
  `data-theme`) and the `cn` package (shadcn's clsx + tailwind-merge replacement).
- Design tokens are in `src/app/globals.css` and mapped into Tailwind `@theme`. shadcn's own
  variables point at the JobDesk tokens. The dark tokens are proposals (D18).
- Restyled primitives: Button (pill, 36px), Input, Textarea, Select (muted fill, 12px radius,
  ink focus ring), and the Sonner toast (dark pill with a status dot).
- Shared components (`src/components/shared/`): Card, ProfileCard, JobCard, DetailRow + RowAction
  - CopyButton, CalendarCard, InboxCard, StatusPill / StagePill / QuoteStatusPill / PaymentPill,
    KpiCard, EmptyState / ErrorState, InitialsAvatar / AvatarStack, RoundButton.
- Domain helpers: `src/lib/status.ts` (stages, progress, tones, overdue rule D10), `src/lib/dates.ts`
  (business-timezone days, job chip labels), `src/lib/avatar.ts`.
- `/dev/components` replicates shot-profile.png plus a catalogue of every variant (it 404s in
  production). It was checked at 1440px ×1.25 against the reference, at 375px (no horizontal
  overflow) and in dark mode.
- Fixes found while checking:
  - JobCard padding was tightened to the reference height.
  - The AvatarStack screen-reader label escaped the scroll strip and widened the page on mobile.
  - `turbopack.root` is pinned: a stray `~/package-lock.json` crashed `next build`.
- Note: shot-profile.png colours its job cards decoratively (a Scheduled job shown peach). The
  app follows the CLAUDE.md stage → colour table.
- Dev server: `pnpm dev` runs on **port 3210**, because port 3000 is used by another app on this
  machine. E2E runs on 3100.
- Checks: lint ✓, typecheck ✓, 20 unit tests ✓, `next build` ✓.

## Phase 2: database, schema and seed (2026-10-01)

- Postgres 16 runs via `docker compose up -d` on host port **5442** (`jobdesk-db`). The test
  database `jobdesk_test` is on the same server.
- Prisma 7.10:
  - `prisma.config.ts` holds the URL. `prisma generate` works without one (fresh clone / CI);
    migrate and seed need it.
  - The client is generated into `src/generated/prisma` (gitignored) and regenerated on
    `postinstall`.
  - `src/lib/db.ts` is a singleton with the `PrismaPg` adapter.
- Schema = PLAN.md section 3, with:
  - the Auth.js adapter tables (Account, Session, VerificationToken)
  - a `DEV_LOCAL` storage provider (dev only, for photos before Drive/Dropbox)
  - a `JOB_REMINDER` activity type (D4)
  - Migration: `20261001114026_init`.
- Conventions:
  - DATE columns (Quote.date, Transaction.date) store the business-local day as UTC midnight
    (`dayToDbDate` / `dbDateToDay`).
  - Job times are real instants built with `zonedInstant(day, "09:00", tz)`.
- `src/lib/money.ts`: string → cents parsing with no floats, `formatMoney`, `formatSigned`,
  `centsToInput`, `sum`, `percentToBps`, `formatBps`, `marginPercent`.
- Seed (`pnpm db:seed`) comes from `src/features/settings/sample-data.ts`, which phase 10 reuses
  for "Reload / clear sample data":
  - 3 users, 9 categories, 44 items, 6 customers, 10 jobs (all stages), 6 quotes / 20 lines,
    22 transactions, 7 activities
  - Demo login: `owner@jobdesk.test` / `jobdesk123`. Staff: `jordan@` and `alex@jobdesk.test`.
- Checked in SQL against the screenshots: Q-1001 $338.04, Q-1002 $1,206.36, Q-1003 $480.60,
  Q-1004 $235.44, Q-1006 $356.40 with an unpriced fan line, unpaid balance $841.80.
- Tests: Vitest now has two projects, `unit` and `integration`. Integration tests use a real
  Postgres (`jobdesk_test`); the guard refuses any database not named `*_test`. 38 tests pass.
- Checks: lint ✓, typecheck ✓, tests ✓, build ✓.

## External setup still needed (by you)

- Google Cloud OAuth client: Drive API, scope `drive.file`, redirect
  `http://localhost:3210/api/storage/callback/google`.
- Dropbox scoped app: `files.content.read` and `files.content.write`, redirect
  `http://localhost:3210/api/storage/callback/dropbox`.

## Next

Phase 2: database, schema and seed data.
