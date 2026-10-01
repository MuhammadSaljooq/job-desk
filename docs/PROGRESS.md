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

## Phase 3: auth and the app shell (2026-10-01)

- **Auth.js v5** (beta.32), credentials + JWT sessions (`src/auth.ts`). The Prisma adapter is
  wired in for future magic links. Passwords use bcryptjs (D16), and a constant-time dummy
  compare means unknown emails can't be detected by timing.
- `src/proxy.ts` (Next 16's replacement for middleware) is an optimistic cookie gate that
  sends visitors to `/login?next=`. `/login` itself checks the session, so a stale cookie
  can't cause a redirect loop.
- `src/lib/auth.ts`:
  - `requireUser()` loads the user, business, role and timezone **from the database on every
    request** (cached per request), so a role change or deleted user takes effect immediately.
  - Also provides `requireOwner()` / `assertOwner()`.
- `src/lib/action.ts`: `ActionResult` `{ok, data} | {ok:false, error, fieldErrors}` and a
  `runAction()` wrapper that re-throws redirects.
- Sign in and `/change-password` (for owner-created accounts, D3). `next` is validated with
  `safeNextPath`, so there are no open redirects.
  - Fixed: React 19 resets forms after an action, so the email is now echoed back and kept
    after a wrong password.
- Shell, matching the screenshots:
  - top bar: menu + jump-to circles, a centred pill nav, a white tools pill (+ New, bell with
    unread dot and popover, search), the ink avatar menu
  - floating dark rail with tooltips, Breadcrumb + FilterPill, the dark toast
  - Below 768px: logo top bar, bottom tab bar (Home, Customers, Quotes, Books, More) and a More
    sheet with every rail page, the create actions and sign out.
  - Fixed: tablet-width overlap (the pill nav flows normally below 1024px), and the mobile
    buttons that ignored `hidden`.
- ⌘K search across customers (name, address, email, phone digits), jobs and quotes (any of
  "1004", "Q-1004", "#1004"), always scoped to the business.
- Activity: `latestActivity()` shows the customer avatar on the dashboard and the actor on the
  profile, and highlights the newest unread item. `/activity` page with filters and Mark all
  read.
- Placeholder pages for every route.
- Tests:
  - 56 Vitest (unit + integration with a mocked Auth session via `signInAs()`)
  - 6 Playwright E2E (sign in / wrong password / redirect back, pill nav + rail, ⌘K, bell,
    sign out, mobile tab bar). E2E uses its own `jobdesk_e2e` database (migrated and seeded
    per run) and a server on port 3100 with `NEXT_DIST_DIR=.next-e2e`.
- ⚠️ **Disk space: the Mac had only 144 MB free.** That caused the Turbopack panics. I deleted
  only the regenerable `.next*` caches, which brought it back to 3.7 GB. Free up space before
  long sessions.
- Checks: lint ✓, typecheck ✓, 56 tests ✓, 6 E2E ✓, build ✓.

## Phase 4: customers and jobs (2026-10-01)

- **Quote math, ready for phase 7:**
  - `src/features/quotes/totals.ts`: cents only; lines rounded half away from zero; the
    discount is capped at the subtotal; tax is charged on subtotal − discount.
  - `src/features/quotes/sql.ts` is the same math in Postgres. A test checks the two agree for
    every seeded quote and for awkward cases (fractional quantity, half cents, discounts).
  - `customerBalances()` returns accepted work, paid and balance per customer (seed total
    $841.80).
- Customers list (`/customers`):
  - card grid 3 / 2 / 1, matching shot-customers.png: avatar, address, latest job + stage
    pill (overdue jobs shown first)
  - call / text / directions buttons (disabled when there's no phone or address), job and
    photo counts, a red "Owes $…" chip
  - debounced search (`?q=`, name / phone digits / address / email) and a filter pill
    (`?filter=` all / active / none / owes)
  - kebab menu: open, edit, delete (owner only), with confirmation
  - empty and no-match states
- Customer dialog (React Hook Form + the shared Zod schema; field errors from the server are
  mapped back to the fields).
- Job dialog:
  - customer picker when opened from + New
  - category suggestions, stage, date + time in the business timezone (09:00 by default)
  - crew toggles (the server checks assignees belong to the business), notes
- Customer profile (`/customers/[id]`), matching shot-profile.png:
  - ProfileCard (message / call / directions / email, customer since, Active / Past)
  - "Sarah's jobs ▾" jump menu with a JobCard strip
  - Customer details (copy, call, map, edit)
  - Job schedule calendar (`?month=`; tapping a day jumps to its job, an empty day starts a
    job on that date) with Next visit
  - Notes and messages (add a note; actor avatars)
  - route tabs with counts, and summary pills (accepted / paid / balance)
- Jobs tab:
  - inline optimistic StageSelect, which writes a JOB_STAGE_CHANGED activity and sets or
    clears completedAt
  - date, crew, photo count, notes, edit, delete with confirmation
  - `?job=` scrolls to and highlights a job
  - Breadcrumb: "● All jobs" filter pill (`?jobs=`) and MonthPicker.
- Shared: MonthPicker (+ `src/lib/month.ts`), ConfirmDialog, FormField. The Quotes / Payments /
  Photos tabs share the header and tabs, with content coming in phases 5, 7 and 8.
- Bugs found by testing and fixed:
  - The debounced search could fire `router.replace` after you'd navigated away, which
    pulled you back to /customers.
  - shadcn's CommandDialog left an invisible "Search" heading on every page.
  - The Radix Select "item-aligned" mode placed the list off-screen. All selects now anchor
    under their trigger ("popper").
  - Grids without explicit columns grew to fit long emails on phones (486px layout on a 390px
    screen). They now use `grid-cols-1`. The E2E overflow check now compares with the real
    viewport width.
  - The URL opens the dialogs (`?new=` / `?edit=`) instead of a setState inside an effect.
- Tests:
  - 80 Vitest: customer and job actions, roles, cross-business isolation, filters, search,
    profile summary, SQL / JS totals parity
  - 11 Playwright E2E: create customer → add job → Completed; search, filter, edit; + New job;
    staff can't delete; mobile profile
- Checks: lint ✓, typecheck ✓, tests ✓, E2E ✓, build ✓.

## Phase 5: job site photos (2026-10-01)

- **Storage layer** (`src/lib/storage/`):
  - The `StorageProvider` interface: ensureFolder, createUploadSession, finalizeUpload,
    getFile (redirect or stream), webLink, move, delete.
  - Google Drive (`drive.file`) and Dropbox, using their REST APIs through `fetch`. No
    googleapis or dropbox SDKs (fewer dependencies). Tokens refresh automatically; a 401
    triggers one retry, then the connection is marked REVOKED.
  - `FakeStorage` for tests.
  - `DevLocalStorage`: **development only** (`STORAGE_DEV_LOCAL=1`, refused in production).
    Files go in `.storage/{businessId}/` with a path-escape guard, so photos work before the
    OAuth apps exist.
- `paths.ts` builds `JobDesk/Customers/{Customer}/{Job or General}/{Before|During|After}/YYYY-MM-DD_HHmm_{id}.jpg`
  with names sanitised for Drive, Dropbox, Windows and macOS. Renaming a customer or job moves
  its photos (`relocatePhotos`).
- `src/lib/crypto.ts`: AES-256-GCM for refresh tokens (`v1.iv.tag.ct`), plus HMAC-signed,
  expiring tokens for upload sessions and OAuth state.
- OAuth:
  - `/api/storage/connect/[provider]`: owner only; the state is signed and a nonce cookie
    guards against CSRF.
  - `/api/storage/callback/[provider]`: exchanges the code (offline access), gets the account
    email, creates the `JobDesk/Customers` folder, stores the refresh token encrypted, one
    connection per business.
  - Missing keys redirect to `/settings?storage=not-configured`.
- Upload flow:
  1. The browser compresses the photo (browser-image-compression, 1600px, ~0.75).
  2. `POST /api/storage/upload-session` checks the customer / job belong to the business, the
     file is an image and ≤ 15 MB, and returns the provider upload URL + a signed ticket.
  3. The browser PUTs / POSTs straight to the provider (XHR progress per file).
  4. `savePhotosAction` verifies each ticket (same user, not expired), confirms the file with
     the provider and stores provider / fileId / path only, with **one** activity per batch
     ("2 During photos added to Unit 12 turnover").
- `GET /api/photos/[id]/file?size=thumb|full` checks access, then redirects to a short-lived
  link (Drive thumbnailLink at =s480 / =s1600, Dropbox temporary link) cached for about 4 min,
  or streams the bytes (Dropbox thumbnails, dev storage) with nosniff + a sandbox CSP.
- UI:
  - Photos tab, matching shot-photos.png: ProfileCard + upload card (attach to job / General,
    Before / During / After, drop zone with `accept="image/*" capture="environment"`, multiple
    files, progress)
  - "Connect Google Drive / Dropbox" for the owner, "Ask the owner…" for staff, Reconnect when
    revoked
  - gallery with filter tabs + counts, caption search, groups by job (newest first) with the
    stage pill, Before → During → After order inside a group, After gets the white badge
  - photo viewer: edit caption / stage / job (moves the file), delete (also removes it from
    storage), Open in Drive / Dropbox, ← → keys
  - `/photos` all-photos gallery filtered by customer, stage and date range
  - `latestPhotos()` for the dashboard
- Seed: 13 placeholder photos in dev storage when `STORAGE_DEV_LOCAL=1`. Each database clears
  only its own businesses' folders, since E2E shares `.storage`.
- Tests:
  - 104 Vitest: full upload flow with FakeStorage (rejects non-images, >15 MB, other
    businesses, other customers' jobs, foreign or unfinished tickets), stage / job moves,
    rename relocation, delete-in-storage, latest six, no-storage messages, crypto
    round-trip / tamper / expiry
  - Drive and Dropbox request shapes against a scripted fetch: folder chain + caching, CORS
    origin header, thumbnail sizing, finalize parent check, 401 retry → revoked,
    invalid_grant, temp upload link, metadata, move, delete-409
  - 15 Playwright E2E: a **real JPEG uploaded through the browser pipeline**, thumbnail loads,
    caption + move to After, delete; gallery filters / search / arrow keys; all-photos
    filters; camera input on phone
- **To go live with real storage:** add `GOOGLE_CLIENT_ID/SECRET` and/or
  `DROPBOX_APP_KEY/SECRET` to `.env`, set `STORAGE_DEV_LOCAL=0`, and connect from Settings
  (phase 10 adds the Storage card; `/api/storage/connect/google` already works).
- Checks: lint ✓, typecheck ✓, tests ✓, E2E ✓, build ✓.

## Phase 6: item catalog and Excel import (2026-10-01)

- SheetJS 0.20.3 from the official CDN tarball (the npm `xlsx` package is stale). It's
  loaded only when a file is read.
- `src/features/catalog/import-excel.ts` (pure, unit tested):
  - The header row is optional and detected by column names in any order (Category / Item /
    Name / Service / Unit / UOM…).
  - Without a header: 3+ columns = Category, Item, Unit; 2 columns = Item + Unit if the second
    column looks like units, else Category + Item; 1 column = Uncategorized.
  - Blank rows are skipped and extra columns (Price, Notes) ignored. Unit synonyms are mapped
    (ea, hrs, SF, sq. ft., LF, gal…); the default unit is "each".
  - Each row comes back as new / duplicate (case-insensitive, against the catalog _and_
    earlier in the file) / invalid (no name, unknown unit, too long), with a reason.
  - Excel paste (tabs) and CSV (quotes, "" escapes) both work. Limit: 2000 rows.
- Actions:
  - create / edit / delete items; a category can be picked or typed (case-insensitive, created
    at the end of the list)
  - create / rename / delete categories (only empty ones can be deleted)
  - `importCatalogAction` re-validates every row on the server and skips duplicates again
  - Staff can manage the catalog. Deleting an item leaves past quote lines intact.
- Queries: "times quoted" (distinct quotes) and "last price" (newest priced quote) are
  computed from QuoteLine in SQL. **The catalog stores no prices.**
- `/catalog`, matching shot-catalog.png:
  - import card: sample columns, Upload .xlsx / .csv, paste box, preview table with status
    pills and reasons, "Import N items"
  - toast like the screenshot: "Imported 38 items, skipped 2 duplicates"
  - categories card: counts, ?category= filter, rename / delete menu, New category
  - items table: search (?q=), category pill, unit, times quoted, last price / "Not yet",
    edit, delete with confirmation
  - item dialog with a "no prices here" note; empty catalog state
- Bug fixed everywhere: the sr-only "Actions" header escaped the table's scroll container and
  made phone pages 600px wide. All scrollers (and `.scroll-strip`) are now `relative`. A new
  E2E **phone sweep** visits every page and the customer tabs at 412px.
- Tests:
  - 120 Vitest: the parser (header, no header, one column, two-column guessing, blank rows,
    extra columns, duplicates, invalid, units, paste / CSV, a real .xlsx), actions, roles,
    cross-business isolation, server-side import validation, times quoted / last price
  - 20 Playwright: an .xlsx fixture (38 new + 2 duplicates) → preview → import → toast →
    counts; paste with an invalid row; add / edit / search / delete an item; delete an empty
    category; the phone sweep
- Checks: lint ✓, typecheck ✓, tests ✓, E2E ✓, build ✓.

## Phase 7: fast quotes and PDF (2026-10-01)

- New dependencies: `@react-pdf/renderer` (in the stack) and `@dnd-kit/core`, `/sortable`,
  `/utilities` for drag to reorder lines (approved 2026-10-01).
- `src/features/quotes/totals.ts` (pure, in cents, unit tested): the discount is capped at the
  subtotal and negatives are ignored, tax is charged on subtotal minus discount, and lines and
  tax round half away from zero. Quantities are handled without float drift. The same maths
  runs in SQL (`sql.ts`) for lists and KPIs.
- Quote numbers come from `Business.nextQuoteNumber` inside a transaction when the draft is
  created (D7). They stay unique even when two drafts are created at once.
- `/quotes`, matching shot-quotes.png:
  - KPI cards: Drafts, Sent + value waiting, Accepted + value won, Unpaid balance ($841.80 on
    the seed, D9)
  - status filter, month picker (All time by default), search
  - table with status and payment pills (Paid / Part paid / Unpaid / None yet)
- `/quotes/new`: pick a customer (empty state when there are none).
- `/quotes/[id]`, matching shot-builder.png:
  - Quick add: search, category pills, "last quoted $X". A tap adds qty 1 with an EMPTY price
    and focuses it; a second tap adds +1.
  - Sheet: customer, job title, date, "When accepted: use job / new job", lines with editable
    name, qty, typed price, amount, remove and drag to reorder; + Custom line; notes; discount,
    tax %, total
  - Debounced autosave that never runs two saves at once, with a "Saved" indicator. A stale
    version is refused instead of overwriting newer edits.
  - Actions by status:
    - Draft: Preview, Mark as sent, Accept, Decline, Delete
    - Sent: Preview, Accept, Decline
    - Accepted: PDF, Open job, Record payment until paid, then "Paid in full". Accepted
      quotes are locked.
    - Declined: Reopen as draft
  - Unpriced lines block sending, accepting and the PDF (D6). Typing 0 counts as priced.
  - Accept creates a SCHEDULED job, or moves a linked Lead / Quoted job to Scheduled. Mark as
    sent moves a Lead to Quoted. Each writes Activity and shows a toast.
  - Record payment opens the transaction form, prefilled with the balance, as a Deposit if
    nothing has been paid yet (else Job Payment) and linked to the quote.
  - On phones, Quick add stacks above the sheet.
- `GET /api/quotes/[id]/pdf` renders QuoteDocument: business name and logo, number, date,
  customer, items, totals, notes, footer. It returns 409 while a line is unpriced.
  `?download=1` saves the file instead. The ⋮ menu has Download PDF and, on touch devices
  that can share files, Share PDF (Web Share API, falls back to download) (D5).
- Bookkeeping groundwork for phase 8: `src/features/books` has the transaction schema,
  categories, actions (create / update / delete, staff can't delete, links checked against
  the business) and `TransactionDialog`. The /books page itself is still phase 8.
- Bug fixed: after a payment the dialog toasted and closed before the page refreshed, so a
  quick second "Record payment" prefilled the old balance. The refresh now runs in a
  transition and the button stays disabled until it lands (caught by the E2E test).
- Tests:
  - 132 Vitest: totals (screenshot and seed quotes, discount cap, tax, rounding, fractional
    qty), payment state, numbering under concurrency, autosave versions, line validation,
    the D6 block, accept → job + Activity, decline / reopen / delete, cross-business
    isolation, payments and paid in full, transaction link rules, the seed KPIs
  - 23 Playwright: build a quote from the catalog → price → custom line → discount → reload →
    PDF + download → send → accept → two payments → Paid; status filter and search; Quick add
    above the sheet on a phone
- Not in this phase: route-level loading / error states for all pages are planned for
  phase 11.
- Checks: lint ✓, typecheck ✓, tests ✓, E2E ✓, build ✓.

## External setup still needed (by you)

- Google Cloud OAuth client: Drive API, scope `drive.file`, redirect
  `http://localhost:3210/api/storage/callback/google`.
- Dropbox scoped app: `files.content.read` and `files.content.write`, redirect
  `http://localhost:3210/api/storage/callback/dropbox`.

## Next

Phase 8: bookkeeping (`docs/prompts/08-bookkeeping.md`).
