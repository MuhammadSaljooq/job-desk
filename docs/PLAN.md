# JobDesk build plan (Phase 0)

Status: approved 2026-10-01 (decisions in section 5). No code has been written yet. The sources are `CLAUDE.md`,
`docs/page-spec.md`, `docs/client-overview.md`, `docs/seed-data.md`, `docs/screens/*` and
`docs/prompts/*`.

## 1. Product summary

JobDesk is a small, phone-friendly back office for Dylan's handyman / home repair business. It
replaces scattered notes, camera rolls and spreadsheets with one place to:

- track every customer and their jobs through a five-stage pipeline (Lead → Quoted → Scheduled
  → In Progress → Completed)
- keep Before / During / After job site photos, filed automatically into Dylan's own Google
  Drive or Dropbox
- build a quote in under a minute by tapping items from a price-free catalog and typing the
  price
- keep a simple ledger of money in and money out, tied back to customers and quotes

Accepting a quote creates the job. Recording a payment marks the quote paid. Everything shows
up on a dashboard that answers "what needs me today?" The owner and field staff use it on a
desktop in the office and on a phone at the job site. It follows a soft, rounded design: a sage
canvas, white cards, pastel status colors and black for the active state.

## 2. Pages, routes and main components

All signed-in pages live in `src/app/(app)/` and share the shell. The shell has:

- a top pill nav (Home, Customers, Quotes, Books)
- the dark icon rail
- header tools (+ New, notifications, search ⌘K, avatar menu)
- a Breadcrumb with a right-hand slot for filters and actions
- the Sonner toast
- below 768px: a bottom tab bar and a More sheet

| #   | Page                       | Route                      | Screen                  | Main components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------- | -------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —   | Sign in                    | `/login`                   | — (styled like the app) | Centered white card, email + password form (React Hook Form + Zod), error state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 1   | Dashboard                  | `/`                        | shot-dashboard          | Breadcrumb: greeting, stage filter pill, month picker. **Row 1:** ProfileCard as owner card (quick buttons: New quote, New customer, New job, Log expense; today's date; "N jobs today"), "Ongoing jobs" dropdown pill, horizontal strip of JobCards. **Row 2:** "This month" card (DetailRow list: revenue, expenses, net + margin pill, open quotes, active jobs), CalendarCard (day click opens a Sheet listing that day's jobs), Activity InboxCard (latest 6). **Row 3:** PipelineBoard (5 columns, stage Select per card), MoneyChart (Recharts bars, last 6 months), LatestPhotos (6 tiles). Each card in its own Suspense + skeleton. EmptyState "No jobs yet" |
| 2   | Customers list             | `/customers?q=&filter=`    | shot-customers          | Breadcrumb: search input (debounced, URL param), filter pill (All / Active jobs / No jobs / Owes money), "+ Customer". CustomerCard grid (3/2/1): avatar, name, address, latest job panel + StatusPill, job / photo count chips, call / text / directions buttons. CustomerDialog (new / edit), ConfirmDelete (Owner only). EmptyState                                                                                                                                                                                                                                                                                                                                 |
| 3   | Customer profile, Jobs tab | `/customers/[id]`          | shot-profile            | Breadcrumb ← name, status filter pill, month picker; header actions: Edit details, + Job, New quote. **Row 1:** ProfileCard (message, call, directions, email; Customer since; Active/Past pill) + "{Name}'s jobs" JobCard strip. **Row 2:** Customer details card (DetailRows with copy / call / map / edit), Job schedule CalendarCard + "Next visit" panel, Notes and messages InboxCard (add note). **Bottom:** route tabs (Jobs, Job site photos, Quotes, Payments, each with a count) + summary strip (Accepted work, Paid, Balance). **Jobs tab:** JobsTable (inline stage Select, date, assignees, notes, photo count, edit / delete) + JobDialog              |
| 3b  | Profile, Photos tab        | `/customers/[id]/photos`   | shot-photos             | ProfileCard; UploadCard (Attach to job Select or General, Before / During / After segmented control, drop zone with `accept="image/*" capture="environment"`, multiple files, per-file progress; "Connect Google Drive / Dropbox" for the Owner or "Ask the owner…" for Staff); Gallery (filter tabs with counts, caption search, groups by job with StatusPill, PhotoTile with stage badge + caption); PhotoViewer dialog (edit caption / stage / job, delete, "Open in Drive / Dropbox", ← → keys); ReconnectBanner                                                                                                                                                  |
| 3c  | Profile, Quotes tab        | `/customers/[id]/quotes`   | —                       | The quotes table filtered to this customer (total, status pill, payment pill)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 3d  | Profile, Payments tab      | `/customers/[id]/payments` | —                       | This customer's income transactions + "Record payment"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 4   | Quotes list                | `/quotes?status=&month=`   | shot-quotes             | Breadcrumb: status pill, month picker, "+ New quote". 4 KpiCards (Drafts, Sent + value waiting, Accepted + value won, Unpaid balance). QuotesTable (number, customer avatar + name, job, date, total, status pill, payment pill) with search                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 5   | Quote builder              | `/quotes/[id]`             | shot-builder            | Breadcrumb "Quote Q-1006" + status pill; status-dependent actions (Preview, Mark as sent, Decline, Accept and create job / Open job, Record payment / Reopen). **Left:** QuickAdd card (search, category pills, item rows with "last quoted $X" and a +/✓ button). **Right:** QuoteSheet (customer combobox, job title, date; line rows with editable name, qty, price input that starts empty, amount, remove, drag handle; + Custom line; notes; totals: subtotal, discount, tax %, total). "Saved" indicator (debounced autosave). PDF preview (opens `/api/quotes/[id]/pdf`). RecordPaymentDialog. On mobile, QuickAdd stacks above the sheet                      |
| 6   | Bookkeeping                | `/books?month=&type=`      | shot-books              | Breadcrumb: month picker (All time / month), Log expense, Record revenue. 4 KpiCards (Revenue + count, Expenses + count, Net profit, Profit margin %). TransactionsTable (All / Revenue / Expenses segmented control; date, description, category pill, customer, ± amount, edit, delete for Owner only). Breakdown cards: "Where the money went" and "Where it came from" bars. TransactionDialog (Revenue / Expense switch, amount, date, category, description, optional customer + quote). Export CSV                                                                                                                                                              |
| 7   | Item catalog               | `/catalog?category=&q=`    | shot-catalog            | Breadcrumb: Import from Excel, + Add item. ImportCard (sample table, "Upload .xlsx or .csv", paste textarea, preview table tagged new / duplicate / invalid, confirm). CategoriesCard (counts, All items, + New category). ItemsTable (search; item, category pill, unit, times quoted, last price, edit, delete). ItemDialog                                                                                                                                                                                                                                                                                                                                          |
| 8   | Settings                   | `/settings`                | shot-settings           | Business ProfileCard; Business profile card (name, phone, email, address, logo upload); Quotes card (default tax, currency, next quote number, default footer); Appearance (Match device / Light / Dark) + notification toggles; Team card (members, role pill + optional title, Add member with temporary password, remove, avatar color); Storage card (connect / disconnect / switch provider, account, Open folder); Data card (export CSV, reload sample data, clear all data). "Save settings". Read-only for Staff                                                                                                                                              |
| R1  | Activity (rail)            | `/activity`                | —                       | Full InboxCard list, paged, filter by type, mark all read _(not in the spec; D11)_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| R2  | Calendar (rail)            | `/calendar?month=`         | —                       | Large CalendarCard for all jobs + a day Sheet _(D11)_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| R3  | All photos (rail)          | `/photos`                  | —                       | Gallery across customers, filtered by customer / job / stage / date range (the spec's "All photos gallery")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| —   | Dev components             | `/dev/components`          | shot-profile            | Every shared component with sample props (phase 1; excluded from production)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**API routes**:

- `/api/auth/[...nextauth]`
- `/api/storage/connect/[provider]`
- `/api/storage/callback/[provider]`
- `POST /api/storage/upload-session`
- `GET /api/photos/[id]/file?size=thumb|full`
- `GET /api/quotes/[id]/pdf`
- `GET /api/export/[kind].csv`

**Global UI:**

- CommandSearch (⌘K) across customers, jobs and quotes
- NotificationsPopover, which reads unread Activity
- NewMenu (customer, job, quote, photo, expense, payment)

## 3. Proposed Prisma data model

Conventions:

- Every model has `id String @id @default(cuid())`, `createdAt` and `updatedAt`.
- Every business-owned model has `businessId` with an index.
- Money is `Int` cents, and tax is `Int` basis points.
- The Auth.js adapter tables (`Account`, `Session`, `VerificationToken`) follow the standard
  shapes and are omitted here.

```prisma
enum Role              { OWNER STAFF }
enum StorageProvider   { GOOGLE_DRIVE DROPBOX }
enum CustomerType      { HOMEOWNER LANDLORD BUSINESS }
enum CustomerStatus    { ACTIVE PAST }
enum JobStage          { LEAD QUOTED SCHEDULED IN_PROGRESS COMPLETED }
enum PhotoStage        { BEFORE DURING AFTER }
enum QuoteStatus       { DRAFT SENT ACCEPTED DECLINED }
enum TransactionType   { INCOME EXPENSE }
enum TransactionCategory {
  JOB_PAYMENT DEPOSIT OTHER_INCOME                                   // INCOME
  MATERIALS TOOLS_EQUIPMENT FUEL_VEHICLE SUBCONTRACTOR INSURANCE      // EXPENSE
  MARKETING SOFTWARE OTHER_EXPENSE
}
enum ActivityType {
  NOTE CUSTOMER_CREATED JOB_CREATED JOB_STAGE_CHANGED PHOTO_UPLOADED
  QUOTE_SENT QUOTE_ACCEPTED QUOTE_DECLINED PAYMENT_RECORDED NEW_LEAD
}

model Business {
  id String @id @default(cuid())
  name String
  tagline String?                 // "Handyman and home repair"
  logoFileId String?              // original in the connected Drive/Dropbox (D14)
  logoThumb Bytes?                // resized copy, at most 400px / ~30 KB, for PDFs and the header (D14)
  logoMime String?
  phone String?  email String?  address String?
  currency String @default("USD")
  timezone String @default("America/New_York")   // D10, editable in Settings
  taxRateBps Int @default(800)
  nextQuoteNumber Int @default(1001)
  quoteFooter String?
  notifyJobReminders Boolean @default(true)
  notifyPayments Boolean @default(false)
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  users User[]  customers Customer[]  jobs Job[]  quotes Quote[] ... // back-relations
}

model User {
  id, businessId, name String, email String @unique, emailVerified DateTime?
  passwordHash String?            // bcryptjs (D12)
  mustChangePassword Boolean @default(false)   // set when the owner creates the account (D3)
  role Role @default(STAFF)
  title String?                   // optional display label, e.g. "Technician" (D11)
  avatarColor String
  themePreference String @default("system")    // system | light | dark
  jobs Job[] @relation("JobAssignees")
  @@index([businessId])
}
// No Invite model: the owner creates staff accounts with a temporary password (D3).

model StorageConnection {
  id, businessId String @unique   // one per business
  provider StorageProvider
  accountEmail String
  encryptedRefreshToken String    // AES-256-GCM: iv.tag.ciphertext (base64)
  rootFolderId String?            // the JobDesk folder id (Drive) or path (Dropbox)
  status String @default("ACTIVE")  // ACTIVE | REVOKED, which drives the Reconnect banner
  connectedById String
}

model Customer {
  id, businessId, name String, type CustomerType @default(HOMEOWNER)
  phone String?  email String?  address String?
  accessNotes String?             // gate code, pets
  preferredContact String?        // "Texts, after 5 pm"
  notes String?
  status CustomerStatus @default(ACTIVE)
  isSample Boolean @default(false)
  jobs Job[]  photos Photo[]  quotes Quote[]  transactions Transaction[]  activities Activity[]
  @@index([businessId])  @@index([businessId, name])
}

model Job {
  id, businessId, customerId
  title String, category String?  // free text: "TV & Mounting", "Repairs"
  stage JobStage @default(LEAD)
  scheduledAt DateTime?
  completedAt DateTime?
  notes String?
  isSample Boolean @default(false)
  assignees User[] @relation("JobAssignees")   // implicit m2m
  photos Photo[]  quotes Quote[]
  @@index([businessId])  @@index([customerId])  @@index([businessId, stage])  @@index([businessId, scheduledAt])
}

model Photo {
  id, businessId, customerId, jobId String?
  provider StorageProvider, fileId String, path String
  mimeType String, sizeBytes Int?, width Int?, height Int?
  stage PhotoStage, caption String?
  uploadedById String
  @@index([businessId, createdAt])  @@index([customerId])  @@index([jobId])  @@index([uploadedById])
}

model CatalogCategory {
  id, businessId, name String, sortOrder Int @default(0)
  items CatalogItem[]
  @@unique([businessId, name])
}

model CatalogItem {
  id, businessId, categoryId, name String
  nameKey String                  // lower(trim(name)), for case-insensitive duplicate checks
  unit String @default("each")    // validated against the unit list in Zod
  quoteLines QuoteLine[]
  @@unique([categoryId, nameKey])  @@index([businessId])  @@index([categoryId])
}

model Quote {
  id, businessId, customerId, jobId String?
  number Int                      // shown as Q-{number}
  title String?, date DateTime @db.Date
  status QuoteStatus @default(DRAFT)
  taxRateBps Int, discountCents Int @default(0)
  notes String?, footer String?   // footer copied from Business at creation
  sentAt DateTime?, acceptedAt DateTime?, declinedAt DateTime?
  isSample Boolean @default(false)
  lines QuoteLine[]  transactions Transaction[]
  @@unique([businessId, number])  @@index([customerId])  @@index([jobId])  @@index([businessId, status, date])
}

model QuoteLine {
  id, businessId, quoteId, catalogItemId String?
  name String, category String?, unit String?
  qty Decimal @db.Decimal(10, 2) @default(1)
  unitPriceCents Int?             // NULL = not priced yet (the "$ type price" state)
  sortOrder Int
  @@index([quoteId])  @@index([catalogItemId])
}

model Transaction {
  id, businessId, type TransactionType, category TransactionCategory
  amountCents Int                 // always positive; the type gives the sign
  date DateTime @db.Date
  description String
  customerId String?, quoteId String?
  createdById String?
  isSample Boolean @default(false)
  @@index([businessId, date])  @@index([customerId])  @@index([quoteId])
}

model Activity {
  id, businessId, type ActivityType, message String, detail String?
  customerId String?, actorId String?
  entity String, entityId String  // "job" | "quote" | "photo" | "transaction" | "customer"
  readAt DateTime?
  isSample Boolean @default(false)
  @@index([businessId, createdAt])  @@index([customerId])
}
```

Notes on these choices:

- **`QuoteLine.unitPriceCents` is nullable.** A new line has an empty price. An empty price
  counts as $0 in totals but shows as a "type price" field, and Accept is blocked while any
  line has no price (D6).
- **Derived values are never stored:**
  - Job progress % comes from the stage.
  - Overdue = `scheduledAt` before today, stage SCHEDULED or IN_PROGRESS.
  - A quote's paid amount and status come from linked INCOME transactions.
  - Balance owed = accepted totals − linked income.
  - "Times quoted" and "last price" come from QuoteLine.
- **Customer and Job have no `photoCount`.** Counts come from `_count` / `groupBy`.
- **`isSample`** lets Settings remove or reload the demo data without touching real records.
- **`TransactionCategory` is an enum**, because both lists are fixed in the spec. The labels
  are mapped in `src/features/books/categories.ts`.

## 4. Build phases

| Phase | Prompt                    | Delivers                                                                                                                                                                                                                                                                                                                            | Plan first? | Key tests                                                                |
| ----- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| 0     | 00-plan                   | This `docs/PLAN.md` (no code)                                                                                                                                                                                                                                                                                                       | yes         | —                                                                        |
| 1     | 01-scaffold-design-system | Next.js 15 + TS strict + pnpm, Tailwind v4 tokens from CLAUDE.md, shadcn primitives, Plus Jakarta Sans, Prettier / Husky / lint-staged, scripts; shared components (ProfileCard, JobCard, DetailRow, CalendarCard, InboxCard, StatusPill, KpiCard, EmptyState); `/dev/components`, checked against shot-profile.png with Playwright | short       | component smoke tests                                                    |
| 2     | 02-database-seed          | docker-compose (Postgres 16), `.env.example`, the Prisma schema above (shown before migrating), seed from `docs/seed-data.md`, `db.ts`, `money.ts`                                                                                                                                                                                  | **yes**     | money.ts unit tests                                                      |
| 3     | 03-auth-app-shell         | Auth.js v5 (credentials now, magic link later), middleware, `requireUser()` + role helpers, the full shell (top bar, rail, breadcrumb, toasts, mobile tab bar + More sheet), ⌘K search, placeholder pages for every route                                                                                                           | short       | auth / role unit tests, e2e sign in                                      |
| 4     | 04-customers-jobs         | Customers list (search, filters, card grid, dialogs) and profile (ProfileCard, job strip, details, schedule, notes, summary, route tabs, Jobs tab with inline stage changes writing Activity)                                                                                                                                       | short       | e2e: create customer → add job → Completed                               |
| 5     | 05-job-site-photos        | `src/lib/storage` (interface, Google Drive, Dropbox, fake), OAuth connect / callback, AES-GCM crypto, `paths.ts`, upload-session route, client compression + direct upload, gallery, viewer, file proxy route, latest-photos query                                                                                                  | **yes**     | paths.ts + upload flow with fake.ts                                      |
| 6     | 06-catalog-excel-import   | Catalog page, item dialog, `import-excel.ts` (SheetJS) with preview and duplicate skipping                                                                                                                                                                                                                                          | short       | parser: header, no header, one column, blanks, duplicates, extra columns |
| 7     | 07-quotes-pdf             | Quotes list + KPIs, quote builder (quick add, autosave, drag reorder), `totals.ts`, quote numbering in a transaction, status actions, Accept → job, Record payment, PDF route                                                                                                                                                       | **yes**     | totals.ts (discount cap, tax, rounding), numbering, accept flow          |
| 8     | 08-bookkeeping            | Books page: KPIs, table, breakdown bars, transaction dialog, SQL aggregates, CSV export; Payments tab and quote paid status                                                                                                                                                                                                         | short       | aggregates, CSV                                                          |
| 9     | 09-dashboard              | Dashboard rows 1–3 with filters, Suspense skeletons, Recharts chart                                                                                                                                                                                                                                                                 | short       | dashboard numbers vs seed                                                |
| 10    | 10-settings-team          | Settings cards, owner-created staff accounts and roles, storage card (connect / switch / copy), appearance (dark tokens), notification toggles, CSV export, sample data reset / clear; role checks in actions                                                                                                                       | short       | role enforcement on every action                                         |
| 11    | 11-polish-tests-deploy    | 375 / 768 passes, empty / loading / error states, PWA manifest, full e2e journey, GitHub Actions CI, deploy (A: Vercel + Neon or B: AWS + Terraform), `docs/DEPLOY.md`                                                                                                                                                              | ask hosting | full e2e in CI                                                           |

Each phase ends with the 99-fix-ups checklist, an update to `docs/PROGRESS.md` and one commit.

## 5. Decisions (agreed 2026-10-01)

All 21 open questions were answered. The D-numbers are referenced in the schema and in later
phases.

| #   | Topic                      | Decision                                                                                                                                                                                                                                                              | Phase       |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| D1  | Team or solo               | **Keep team features.** Owner + Staff roles, job assignees, crew avatars and the Team card. The spec's open comment can be answered: "keeping it".                                                                                                                    | 2, 3, 4, 10 |
| D2  | Client data                | **Placeholders for now.** "Your Company", 8% tax, America/New_York. Dylan changes these in Settings later.                                                                                                                                                            | 2           |
| D3  | Staff accounts             | **The owner creates accounts** in Settings > Team: name, email, role, optional title and a temporary password. `mustChangePassword` forces a new password on first sign in. No email service and no Invite model.                                                     | 3, 10       |
| D4  | Notifications              | **In-app only for v1.** The bell and Activity feed show unread items. "Job reminders the day before" become in-app items for tomorrow's jobs, generated when the dashboard / bell loads (no cron). "Payment alerts" create a notification when a payment is recorded. | 9, 10       |
| D5  | Sending quotes             | **PDF + share; Dylan sends it himself.** "Mark as sent" only changes the status. The preview has Download PDF and, on phones, a Share button (Web Share API with the PDF file; it falls back to download). No email or SMS.                                           | 7           |
| D6  | Unpriced lines             | **Block until priced.** Mark as sent, Accept and the PDF are disabled while any line's price is empty (NULL), and the empty fields are highlighted ("Enter a price for 1 item"). Typing 0 counts as priced.                                                           | 7           |
| D7  | Quote numbers              | **Assigned when the draft is created**, inside a transaction that increments `Business.nextQuoteNumber`. Deleting a draft leaves a gap, which is acceptable.                                                                                                          | 7           |
| D8  | Scheduling                 | **One scheduled date and time per job.** "Add a visit" on the calendar opens the job dialog for that date. A JobVisit model is deferred.                                                                                                                              | 4           |
| D9  | Quotes KPIs                | **Drafts / Sent / Accepted / Unpaid balance**, as in the screenshot. Unpaid = accepted totals − linked income ($841.80 on the seed, not the screenshot's $1,441.80).                                                                                                  | 7           |
| D10 | Overdue                    | **Only SCHEDULED or IN_PROGRESS jobs with a date before today** (in the business timezone). The card keeps its stage %. Lead and Quoted jobs never turn red.                                                                                                          | 4, 9        |
| D11 | Rail pages                 | **Simple full pages** at `/activity` (feed, type filter, mark all read) and `/calendar` (month view of all jobs, a day Sheet). `/photos` is the spec's all-photos gallery.                                                                                            | 3, 5, 9     |
| D12 | Spec vs screenshot buttons | **Follow the screenshots.** The profile card has message, call, directions and **email** (no video). The header has a **+ New** menu (no messages button).                                                                                                            | 3, 4        |
| D13 | Timezone                   | **`Business.timezone`, set in Settings**, default America/New_York. "Today", overdue, "N jobs today", the calendar and reminders all use it.                                                                                                                          | 2, 10       |
| D14 | Staff label                | **An optional `User.title`** ("Technician", "Apprentice"…) is shown when set, otherwise the role. Permissions use the role only.                                                                                                                                      | 2, 10       |
| D15 | Logo                       | **The original goes in Drive/Dropbox, plus a small resized copy in the DB** (`Business.logoThumb`, at most 400px / ~30 KB) for the PDF and header. This is the one documented exception to "no images in the DB".                                                     | 10, 7       |
| D16 | Password hashing           | **bcryptjs**, approved as a new dependency.                                                                                                                                                                                                                           | 3           |
| D17 | Switching storage provider | **Copy in batches with a progress bar** from the Settings page ("Copying 34 of 120"). It resumes next time Settings is opened. No queue or worker.                                                                                                                    | 10          |
| D18 | Design values              | **Screenshot-measured tokens** (CLAUDE.md), not the spec's suggested ones. The dark-mode tokens are proposals, reviewed in phase 10.                                                                                                                                  | 1, 10       |
| D19 | Sample catalog             | **Seed the POC's 44 items** (no invented extras). Replace them with Dylan's Excel list via the importer when it arrives.                                                                                                                                              | 2, 6        |
| D20 | Framework versions         | **Latest stable if compatible.** In phase 1, check current docs (Context7) and use the newest stable Next.js only if Auth.js, Prisma, shadcn/ui and @react-pdf/renderer all support it; otherwise use Next 15. Report the chosen versions before installing.          | 1           |
| D21 | Hosting                    | **Vercel + Neon** (decided 2026-10-03). Vercel project `test11-123f/job-desk-dylan`, region `iad1`; see `docs/DEPLOY.md`.                                                                                                                                             | 11          |

Still waiting on Dylan: his item list in Excel, his business name, logo, address, tax rate and
timezone, and confirmation of who on his team will use the system.

## 6. Risks worth watching

- **Google OAuth verification:** `drive.file` is a non-sensitive scope, but the consent screen
  still needs to be set to "In production". Dropbox apps need production approval after 50
  users (phase 11).
- **Direct browser uploads** need CORS to be set up correctly: Drive resumable sessions are
  created with the app origin, and Dropbox temporary upload links accept a browser POST.
  Prototype this early in phase 5.
- **Autosave races in the quote builder:** use a version counter, last write wins, and an
  optimistic UI.
