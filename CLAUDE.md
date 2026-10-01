# JobDesk

A simple workflow system for Dylan, who runs a small home service business (TV mounting,
repairs, installs). Built by Higher Next Solutions. It covers customers, jobs, job site photos,
an item catalog, fast quotes with PDF, bookkeeping and a dashboard. There is one business per
deployment today, but every row is scoped by `businessId` so it can become multi-tenant later.

## Source of truth
- `docs/page-spec.md`: every page, field, status and the data model (the technical spec)
- `docs/client-overview.md`: what the client expects, in plain words
- `docs/screens/*.png`: the target look for each page
- `docs/seed-data.md`: the sample catalog (44 items, no prices) and the sample data for the seed
- `docs/PLAN.md`: routes, data model and the agreed decisions D1–D21 (section 5); follow them
- `docs/reference/poc-field-service-workspace.html`: the earlier single-file POC. Use it for its
  logic and data only; its visual style is NOT the target.

If the code and the spec disagree, follow the spec and tell me. If the spec and the screenshots
disagree, ask. The two `.md` docs are exports of the Claude Docs listed in their headers, which
remain the master copies.

## Core features
1. Customer and job dashboard (pipeline: Lead, Quoted, Scheduled, In Progress, Completed)
2. Job site photos per customer, tagged Before / During / After and linked to a job
3. Bookkeeping: revenue and expenses with categories, linked to customers and quotes
4. Fast quotes: pick items from a catalog and type the price per quote (the catalog stores NO prices)

## Workflow
- Build in phases from `docs/prompts/00..11`, one phase per session. Don't start the next phase
  until I say so.
- Before coding a phase, show a short plan and wait for my OK. Phases 0, 2, 5 and 7 need a full
  plan (and the schema, for phase 2) before any code or migration.
- After each phase:
  - `pnpm lint`, `pnpm typecheck` and `pnpm test` must pass.
  - Run the checklist in `docs/prompts/99-fix-ups.md`.
  - Update `docs/PROGRESS.md` with what was built, what's left and any decisions.
  - Suggest a commit message.
- Read `docs/PROGRESS.md` at the start of every session.
- Root cause before fixes: reproduce, explain, add a failing test, then fix.
- No new dependencies beyond the stack below without asking me first.

## Tech stack
Next.js 15 (App Router, Server Components, Server Actions) + TypeScript strict, pnpm,
Tailwind v4 + shadcn/ui + lucide-react, Plus Jakarta Sans via next/font,
React Hook Form + Zod, PostgreSQL 16 + Prisma, Auth.js v5 (Prisma adapter),
Google Drive API (`googleapis`) or Dropbox API (`dropbox` SDK) for photos,
browser-image-compression, SheetJS (`xlsx`), @react-pdf/renderer, Recharts, date-fns,
Vitest, Playwright, Docker Compose, ESLint + Prettier + Husky + lint-staged, GitHub Actions.
Hosting is decided in phase 11: Vercel + Neon, or AWS (ECS Fargate + RDS).

## Commands
```
pnpm dev | pnpm lint | pnpm typecheck | pnpm test | pnpm test:e2e
pnpm db:migrate | pnpm db:seed | pnpm db:studio | docker compose up -d
```

## Folder layout
```
src/app/(auth)/login        sign in
src/app/(app)/...           every signed-in page (layout.tsx is the shell)
src/app/api/...             auth, storage connect/callback/upload-session, photos/[id]/file, quotes/[id]/pdf
src/components/ui/          shadcn primitives (restyle via tokens, not per use)
src/components/shell/       PillNav, IconRail, HeaderTools, Breadcrumb, MobileTabBar, Toast
src/components/shared/      ProfileCard, JobCard, DetailRow, CalendarCard, InboxCard,
                            StatusPill, KpiCard, EmptyState
src/features/<area>/        actions.ts, queries.ts, schema.ts, components/
                            (catalog/import-excel.ts, quotes/totals.ts, quotes/pdf/QuoteDocument.tsx)
src/lib/                    db.ts, auth.ts, storage/, crypto.ts, money.ts, utils.ts
tests/unit, tests/e2e, tests/fixtures
```

## Code rules
- Code goes in feature folders. Use Server Components by default, and add `"use client"` only
  where interaction needs it.
- Mutations are server actions, validated with Zod. They return `{ ok: true, data } | { ok: false, error }`.
  The same Zod schema feeds React Hook Form.
- **Every server action and query calls `requireUser()`** and is scoped to the session's
  `businessId`. Never trust a businessId or role sent from the client.
- **Roles are enforced on the server.** OWNER can do everything. STAFF can do everything except
  Settings, deleting customers and deleting transactions. The UI hides those controls too.
- **Money is integer cents** in the DB and in code (`amountCents`, `unitPriceCents`,
  `discountCents`). Tax is basis points (`taxRateBps`, 800 = 8%). Format only in the UI with
  `src/lib/money.ts` (Intl.NumberFormat, always two decimals). Never use floats for money.
- **The catalog stores NO prices.** "Last quoted $X" is computed from `QuoteLine`.
- **Photos are stored only in the business's connected Google Drive or Dropbox**, always through
  `src/lib/storage` (never call a provider SDK anywhere else). The browser uploads straight to
  the provider. The DB keeps the provider, file id, path and metadata, never the image.
  - Google uses the `drive.file` scope only.
  - Images are served via `/api/photos/[id]/file`, which checks access and then redirects to a
    short lived link.
- **OAuth refresh tokens are encrypted** with AES-256-GCM (`src/lib/crypto.ts`,
  `TOKEN_ENCRYPTION_KEY`). Never log tokens.
- **Sums are done in SQL** (Prisma `aggregate` / `groupBy`), not in the browser.
- Meaningful changes write an `Activity` row: a job stage change, a quote sent or accepted, a
  payment recorded, a photo uploaded, or a note added.
- Store dates in UTC and show them in local time with date-fns.
- Every list has loading, empty and error states. Every destructive action asks for
  confirmation.
- Build mobile first: everything works at 375px.
- Secrets live in `.env` only. Keep `.env.example` current.

## Design system (match docs/screens)

**Screenshot scale:** the PNGs are 1800px wide, a 1440px CSS viewport captured at 1.25× device
scale. Divide anything you measure on them by 1.25. For comparisons, screenshot at 1440px width
with `deviceScaleFactor: 1.25`.

Define every token as a CSS variable in `src/app/globals.css` and map it into Tailwind with
`@theme`. Never hardcode colors in components.

Overall look: a soft sage canvas with white rounded cards floating on it. Black is used only
for the active state and the most important items. Pastel cards show status. No borders on
cards, and almost no shadow.

### Colors (light)
The spec's "suggested values" are close to these. The values below were sampled from the
screenshots and take precedence.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#DFE7DE` | canvas (spec suggests #DDE5DC) |
| `--surface` | `#FFFFFF` | cards, nav pill, header buttons |
| `--surface-muted` | `#F3F5F3` | inputs, round icon buttons, segmented track, inner panels, neutral pills |
| `--divider` | `#EEF1EE` | 1px row dividers inside cards |
| `--ink` | `#17191A` | text, active nav pill, primary button, icon rail, toast, highlighted inbox row |
| `--ink-soft` | `#2D3436` | owner "ME" avatar |
| `--rail-active` | `#3B3F41` | active icon circle on the rail |
| `--text-muted` | `#6B716C` | secondary text, labels, table headers (spec: #8A8F8A) |
| `--text-subtle` | `#9AA09B` | placeholders, "None", "Not yet" |
| `--sky` / `--sky-ink` | `#DCEBFB` / `#2F6FD6` | Scheduled, Sent |
| `--peach` / `--peach-ink` | `#FCEBD6` / `#B36B00` | In progress, Part paid (bar `#F0A53A`) |
| `--blush` / `--blush-ink` | `#FBDFE3` / `#C2303A` | Overdue, Expenses KPI, Unpaid, danger (bar/dot `#E5484D`) |
| `--mint` / `--mint-ink` | `#DDF3E4` / `#1F8A4C` | Completed, Accepted, Paid, Active, Revenue KPI, income amounts |
| `--lavender` / `--lavender-ink` | `#E8E5FB` / `#5B4FD6` | Quoted |
| `--neutral-pill` / `--neutral-ink` | `#F3F5F3` / `#6B716C` | Lead, Draft, category pills |
| `--success-dot` | `#38D27A` | green dot in toasts |
| `--danger` | `#E5484D` | notification dot, overdue calendar chip, expense bars |

Income amounts use `--mint-ink` with a "+". Expense amounts use `--blush-ink` with a "−".

**Job stage → color**
| Stage | JobCard bg | Pill | Calendar chip | Progress |
|---|---|---|---|---|
| LEAD | surface-muted | neutral | `#8E98A8` slate | 10% |
| QUOTED | lavender | lavender | `#5B4FD6` indigo | 30% |
| SCHEDULED | sky | sky | `#2F6FD6` blue | 50% |
| IN_PROGRESS | peach | peach | `#F0A53A` amber | 75% |
| COMPLETED | mint | mint | `#1F8A4C` green | 100% |
| overdue (date passed, not completed) | blush | blush | `#E5484D` red | keeps its stage % |

- The progress bar is 4px, filled with the stage's strong color. Its track is the card color
  darkened about 8%.
- Today on the calendar is outlined with a 2px ink ring. The selected day is ink-filled.

**Avatar palette** (`User.avatarColor`; for customers, hash the name):
`#C9825B #4F7FBF #5B8F6A #B05D8E #7A6BC2 #3F8F93 #D09A36 #2D3436`. Initials are white and
semibold.

**Dark mode** (phase 10): use `[data-theme="dark"]` plus `prefers-color-scheme`, with the same
token names.
- bg `#111413`, surface `#1B1F1E`, surface-muted `#252A28`, divider `#2C3230`
- ink `#F2F5F2` (the active pill becomes light with dark text), text-muted `#9AA39C`
- Pastels become about 18% tints of their ink color.

### Typography (CSS px at 1440)
Use Plus Jakarta Sans everywhere, with `tabular-nums` for money, tables and dates.
| Role | Size / weight |
|---|---|
| Page title (breadcrumb) | 22px / 600 |
| Card title | 16px / 600 |
| KPI value | 26px / 700 |
| Name on ProfileCard / title on JobCard | 17px / 700 |
| Body, row values, table cells | 14px / 500 |
| Tiny field label above a value | 11px / 500, text-muted |
| Pills, chips, table headers | 12px / 600 |
| Small meta | 12px / 400, text-muted |

### Shape and spacing (CSS px at 1440)
- Radius: cards and modals 22px, inner panels and inputs 12px, photo tiles 16px, pills and
  buttons fully rounded.
- Spacing: card padding 20px, gap between cards 18px (16px on mobile). The content column starts
  to the right of the rail, about 100px from the left edge. Mobile side gutter is 16px.
- Round icon buttons:
  - 36px circles, `--surface-muted` by default, or `--ink` with a white icon when primary or
    active.
  - Header round buttons and the avatar are 40px.
- Buttons: pill shaped, 36px high, 14px horizontal padding, 13px / 600, with a 15px leading
  icon. Primary is ink with white text; secondary is white with ink text.
- Inputs: `--surface-muted` fill, no border, 12px radius, 40px high. Focus shows a 2px ink ring
  (the "type price" field in shot-builder.png).
- Shadows: none on cards. Only the toast and floating menus get one (`0 8px 24px rgb(0 0 0 / .12)`).
- Icons: lucide-react with stroke 1.75, 16px in rows and 18px on the rail.
- Tables: no outer border, 48px rows with divider lines, money right-aligned.

### Shell
- **Top bar**:
  - Left: two white 40px circles (menu, apps grid).
  - Centre: a white pill nav with Home, Customers, Quotes and Books, each with an icon. The
    active tab is a black pill.
  - Right: a white pill group (+ New menu, bell with a red unread dot, search ⌘K), then the
    ink avatar "ME" with its menu (Settings, Sign out).
- **Icon rail**:
  - A floating vertical `--ink` capsule about 56px wide, vertically centred on the left, with
    fully rounded ends.
  - Items: Home, Activity, Customers, Catalog, Calendar, Photos, Settings.
  - The active icon sits in a `--rail-active` circle. The rail stays visible while scrolling.
- **Breadcrumb**: back arrow + title on the left. On the right, a slot for white filter pills
  (a coloured dot + label, e.g. "● In progress"), a month picker pill with a calendar icon, and
  the primary ink action.
- **Toast** (Sonner): a dark ink pill at the bottom right with a green dot and white 13px / 600
  text. Examples: "Added Ceiling Fan Install. Enter your price." and "Imported 38 items,
  skipped 2 duplicates".
- **Below 768px**:
  - The pill nav becomes a bottom tab bar (Home, Customers, Quotes, Books, More), and the rail
    moves into the More sheet.
  - Card rows stack into one column, and JobCard strips scroll sideways.
  - The quote builder shows Quick add above the sheet.

### Components
- **ProfileCard**:
  - 56px avatar, name and subtitle (muted), kebab menu.
  - A row of 36px round buttons (message, call, directions, email); the first one is ink.
  - "Customer since" label with a date pill, and a mint "Active ✓" pill.
- **JobCard**:
  - Pastel background by stage, with a white date chip, kebab and clock icon.
  - Title, category (muted), and "NN% Stage" over the progress bar.
  - An avatar stack (22px avatars overlapping, plus a "+" circle).
  - A white status chip: "3 days left", "Today", "2 days late", "Done" or "Awaiting reply".
- **DetailRow**: 36px muted icon circle, tiny label over the value, an optional status pill,
  and a trailing muted action icon (copy, call, map, edit).
- **CalendarCard**:
  - Month header with chevrons, Mon–Sun columns.
  - Rounded-square day cells in `--surface-muted`, with coloured chips by stage.
  - A legend with dots, and an optional "Next visit" panel.
- **InboxCard**: title with an icon and "View all". Each row has an avatar, a bold title over a
  muted preview, and the time. The newest unread row is an ink panel with white text.
- **KpiCard**: pastel or white background, label, 26px value, muted caption.
- **StatusPill**: pastel background with its ink text color.
- **EmptyState**: one sentence and one primary action.

## Domain glossary
- Customer type: HOMEOWNER, LANDLORD, BUSINESS. Customer status: ACTIVE, PAST.
- Job stage: LEAD → QUOTED → SCHEDULED → IN_PROGRESS → COMPLETED.
- Quote status: DRAFT, SENT, ACCEPTED, DECLINED. Quote numbers look like `Q-1001` and come from
  `Business.nextQuoteNumber`, taken inside a transaction.
- Quote payment status is derived from linked INCOME transactions: Paid, Part paid, Unpaid /
  "None yet".
- Unpaid balance = accepted totals − linked income.
- Revenue categories: Job Payment, Deposit, Other Income.
- Expense categories: Materials, Tools & Equipment, Fuel & Vehicle, Subcontractor, Insurance,
  Marketing, Software, Other.
- Units: each, hour, sq ft, linear ft, room, sheet, box, gallon, tube, set, load.
- Photo stage: BEFORE, DURING, AFTER. Folder layout in Drive / Dropbox:
  `JobDesk/Customers/{Customer}/{Job title or General}/{Before|During|After}/YYYY-MM-DD_HHmm_{shortId}.jpg`
