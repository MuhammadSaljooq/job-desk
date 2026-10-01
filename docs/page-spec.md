# JobDesk: Page by Page Product Spec

> Exported from the Claude Doc "JobDesk: Page by Page Product Spec" (as of 2026-09-29, rev 16):
> https://claude.ai/artifact/Ccs8JuaVmH1YyY7ghKMP7X. The Claude Doc is the master copy. Re-export
> this file if the doc changes. The screenshots it embeds are in `docs/screens/`.

**Prepared by:** Higher Next Solutions
**Prepared for:** Dylan

## Overview

JobDesk is a simple workspace that lets a small service business run customers, jobs, photos,
quotes and books from one place. It has 8 pages, and every page follows the reference design: a
pale sage canvas, floating white cards, pastel status cards and a dark icon rail.

**Who uses it:** the business owner and field staff, on desktop in the office and on a phone at
the job site.

**The four client requirements and where they live:**

| Requirement | Main page | Also appears on |
| --- | --- | --- |
| Customer / job dashboard | Dashboard | Customers list, Customer profile |
| Job site photo upload per customer | Customer profile (Photos tab) | Dashboard (latest photos) |
| Bookkeeping, revenue and expenditures | Bookkeeping | Customer profile (Payments), Dashboard |
| Fast quotes from preloaded items, price typed by hand | Quote builder | Item catalog, Customer profile |

## Design system

The look comes straight from the reference detail page. It is soft, airy and rounded, and it
uses black only for the active state and the most important items.

**Colors**

| Token | Use | Suggested value |
| --- | --- | --- |
| Canvas | Page background | Pale sage `#DDE5DC` |
| Card | All content panels | White `#FFFFFF` |
| Ink | Text, active nav pill, icon rail, highlighted rows | Near black `#1A1A1A` |
| Muted | Labels, secondary text | Grey `#8A8F8A` |
| Peach | Job card: In Progress | `#FCEBD3`, bar `#F2A93B` |
| Sky | Job card: Scheduled | `#DCEBFA`, bar `#2F6FD6` |
| Blush | Job card: Needs attention / overdue | `#FBDDE1`, bar `#E5484D` |
| Mint | Status pill: Active, Paid, Completed | `#DDF3E4`, text `#1F8A4C` |
| Calendar accents | Event chips on the calendar | Red, blue, amber, indigo, slate |

**Type:** one clean geometric sans, for example Plus Jakarta Sans or Manrope.
- Page title: 22 px semibold
- Card titles: 16 px semibold
- Body: 14 px
- Tiny field labels: 11 px, grey, above each value

**Shape and spacing:**
- Cards have a 20 px radius and 20 px padding, with a 16 px gap between cards.
- Pills and the nav are fully rounded.
- Icon buttons are circular, 36 px.
- Almost no shadow.

**Reusable components from the reference**

- **Top pill nav:** a centered white capsule with icon + label tabs. The active tab is a black
  pill with white text.
- **Icon rail:** a floating dark vertical bar on the left with icon-only buttons. The active icon
  sits in a lighter circle.
- **Header tools:** round buttons at the top right for messages, notifications, search and the
  user avatar.
- **Breadcrumb bar:** back arrow + page title on the left. Filter pills (for example Pending) and
  a month picker on the right.
- **Profile card:** avatar, name, role, a row of round action buttons (message, call,
  directions, video), a start date and a status label.
- **Pastel job card:** date chip, menu dots, title, category, progress label and bar, stacked
  team avatars, and a days left chip.
- **Detail list:** rows of icon + tiny label + value + trailing action icon, with a status pill
  on the first row.
- **Calendar card:** month switcher and a grid of rounded day chips colored by event type.
- **Inbox card:** message rows with avatar, title and preview. The selected or unread row turns
  into a black pill.
- **Floating toast:** a dark rounded bar at the bottom right for confirmations and quick actions.

## Navigation and app shell

Every page shares the same shell, so only the content area changes when you move around.

**Top pill nav (main sections)**

| Tab | Opens | Icon |
| --- | --- | --- |
| Home | Dashboard | House |
| Customers | Customers list | People |
| Quotes | Quotes list | Document |
| Books | Bookkeeping | Ledger |

**Left icon rail (quick jumps and tools):** Dashboard, Inbox / activity, Customers, Item catalog,
Calendar, Photos, Settings. The rail mirrors the reference's dark floating bar and stays visible
while scrolling.

**Top right tools:**
- New quote shortcut
- Notifications: quote accepted, payment recorded, job due today
- Global search across customers, jobs and quotes
- The owner's avatar menu: business profile, Settings, sign out

**Breadcrumb bar:** a back arrow and the page title (for example ← Sarah Mitchell), plus page
filters on the right such as a status pill and a month picker.

**Floating action toast:** bottom right. Used for confirmations ("Quote Q-1004 accepted, job
created") and for a persistent "+ New" menu on mobile.

## Page 1: Dashboard (Home)

The Dashboard answers "what needs me today" in one screen, using the same card grid as the
reference. Screen: `docs/screens/shot-dashboard.png`.

**Breadcrumb bar:** greeting with today's date. On the right, filters for job status (All,
Pending, In Progress) and a month picker.

**Row 1: Owner card + ongoing jobs**
- **Owner card** (left, like the reference profile card): business logo, business name, owner
  name, and quick buttons for New customer, New job, New quote and Log expense.
- **Ongoing jobs strip** (right): a dropdown pill "Ongoing jobs" above a horizontal row of
  pastel job cards. Tapping a card opens the customer profile at that job. Each card shows:
  - the scheduled date chip
  - job title and customer name
  - stage label
  - a progress bar: Lead 10%, Quoted 30%, Scheduled 50%, In Progress 75%, Completed 100%
  - team avatars
  - a days left chip

**Row 2: three panels**

| Panel | What it shows | Actions |
| --- | --- | --- |
| Summary | Revenue this month, expenses this month, net, open quote value, active jobs count | Tap any figure to open Bookkeeping or Quotes filtered |
| Calendar | Month grid; days with scheduled jobs get colored chips by job stage; today is outlined | Change month, tap a day to see that day's jobs |
| Activity inbox | Latest events: quote accepted, photo uploaded, payment recorded, new lead; the newest unread item is a black pill | Tap to jump to the item, "View all" |

**Row 3: Job pipeline and photos**
- **Pipeline board:** columns Lead, Quoted, Scheduled, In Progress, Completed with small job
  cards. The stage can be changed from a dropdown on each card.
- **Money in and out chart:** revenue vs expenses bars for the last 6 months.
- **Latest job site photos:** the 6 most recent thumbnails with a Before / During / After badge.

**Empty state:** "No jobs yet" with buttons to add the first customer or import the item list.

## Page 2: Customers list

One card per customer, so the owner can find anyone in two taps. Screen:
`docs/screens/shot-customers.png`.

**Breadcrumb bar:** "Customers", a search field (name, phone, address), a filter pill (All,
Active jobs, No jobs, Owes money) and a "+ Customer" button.

**Customer card (grid, 3 across on desktop, 1 on phone)**
- Avatar or initials, name, job site address
- Latest job title with its stage pill
- Small tags: number of jobs, number of active jobs, photo count
- Round quick buttons: call, message, directions
- Tap the card to open the Customer profile

**New customer form (modal):** name or company, phone, email, job site address, notes (gate
code, pets, best time to call).

**Empty state:** "No customers yet. Add your first customer to start tracking jobs."

## Page 3: Customer profile and jobs

This page follows the reference design almost one to one: "My Profile & Projects" becomes a
customer's profile and their jobs. Screen: `docs/screens/shot-profile.png`.

**Breadcrumb bar:** ← Customer name. On the right, a job status filter pill and a month picker.

**Layout mapped from the reference**

| Reference element | In JobDesk it becomes | Contents |
| --- | --- | --- |
| Profile card (Robert Smith) | Customer card | Avatar, name, customer type (Homeowner, Landlord, Business), round buttons: message, call, directions, email; "Customer since" date; status label (Active, Past) |
| Ongoing Projects cards | Customer's jobs strip | One pastel card per job: date, title, category (TV mounting, Plumbing…), stage + progress bar, assigned crew avatars, days until the job |
| Detailed Information | Customer details | Full name + Active pill, email, phone, job site address, gate / access notes, preferred contact time; each row has an edit or action icon (copy, call, map) |
| Calendar | Job schedule | This customer's visits for the month, chips colored by stage; tap a day to see or add a visit |
| Inbox | Notes and messages | Internal notes, texts or calls logged, and system events (quote sent, payment received); newest item highlighted as a black pill |
| Floating toast | Quick actions | "Quote Q-1004 accepted" or "+ New job, quote, photo, payment" |

> Open comment on "assigned crew avatars" (2026-09-28): *"I added crew avatars and a Team
> settings card because the reference shows team members on each card. Does the client have
> staff, or is it a one person business so we can drop these?"* This is unresolved.

**Tabs below the cards:** Jobs, Job site photos, Quotes, Payments.
- Jobs lists every job with date, stage dropdown, photo count and delete.
- Quotes lists each quote with its total and paid status.
- Payments lists this customer's revenue entries.

**Summary strip:** jobs count, photos count, accepted work value, paid to date, balance owed.

**Header actions:** Edit details, + Job, New quote.

## Page 4: Job site photos

Photos live inside each customer profile (the Photos tab). They can also be reached from the
rail as a gallery across all customers. Screen: `docs/screens/shot-photos.png`.

**Upload card**
- "Attach to job" dropdown (a job, or General)
- Stage switch: Before, During, After
- Drop zone: drag and drop on desktop, or open the camera or gallery on a phone; multiple photos
  at once
- Photos are resized automatically before saving

**Gallery**
- Filter pills: All, Before, During, After, each with a count
- Photos grouped under each job title with its stage pill
- Thumbnail tiles with a stage badge and caption; After photos get a highlighted badge

**Photo viewer (modal):** large image, editable caption, stage, linked job, date added, uploaded
by, delete. A side by side Before / After compare can come later.

**All photos gallery (rail):** the same tiles across every customer, filterable by customer,
job, stage and date range.

## Page 5: Fast quotes

A quote takes under a minute: tap items from the catalog, type the price, send.

### 5a. Quotes list

Screen: `docs/screens/shot-quotes.png`.

- Summary cards (pastel, like the reference project cards): Drafts, Sent, Accepted with total
  value won, Declined
- Filter pills by status and a month picker
- Table: quote number, customer, job title, date, total, status pill, paid status (Paid, Part
  paid, Unpaid)
- "+ New quote" button

### 5b. Quote builder

Screen: `docs/screens/shot-builder.png`.

**Left card: Quick add**
- Search field for services and supplies
- Category pills: TV & Mounting, Electrical, Plumbing, Drywall & Carpentry, Painting, Assembly,
  Flooring & Tile, Construction Supplies, Labor & Fees
- Item rows with name, unit (each, hour, sq ft…) and the last price quoted as a hint. Tap to
  add; tapping again adds +1 quantity

**Right card: Quote sheet**
- Customer, job title, date
- Line items: name (editable), quantity, price typed by hand, line amount, remove
- "+ Custom line" for anything not in the catalog
- Notes for the customer
- Totals: subtotal, discount, tax %, grand total

**Header actions by status**

| Status | Buttons shown |
| --- | --- |
| Draft | Preview and print, Mark as sent, Mark declined, Accept and create job |
| Sent | Preview and print, Mark declined, Accept and create job |
| Accepted | Open job, Record payment (until fully paid) |
| Declined | Reopen as draft |

**Quote preview:** a clean printable page with the business name, quote number, date, customer
details, items table, totals, notes and a thank you line. It can be printed or saved as a PDF.

**Automation:** accepting a quote creates a Scheduled job in the pipeline. Recording a payment
adds a revenue entry linked to that quote.

## Page 6: Bookkeeping

One ledger for revenue and expenditures, linked to customers and quotes. Screen:
`docs/screens/shot-books.png`.

**Breadcrumb bar:** "Bookkeeping", a period picker (All time or a month), and "Log expense" and
"Record revenue" buttons.

**Summary cards:** Revenue (count of payments), Expenses (count of entries), Net profit, Profit
margin %.

**Transactions card**
- Filter pills: All, Revenue, Expenses
- Table: date, description, category tag, customer, amount (green + for revenue, red − for
  expense), delete

**Breakdown cards (right column)**
- Where the money went: expense categories as horizontal bars
- Where it came from: revenue categories as horizontal bars

**Categories**

| Type | Categories |
| --- | --- |
| Revenue | Job Payment, Deposit, Other Income |
| Expense | Materials, Tools & Equipment, Fuel & Vehicle, Subcontractor, Insurance, Marketing, Software, Other |

**Record entry form (modal):** Revenue / Expense switch, amount, date, category, description,
optional customer, optional linked quote. Attaching a receipt photo can come later.

## Page 7: Item catalog and Excel import

The catalog holds the preloaded items used in fast quotes. It stores no prices, because the
price is typed on each quote. Screen: `docs/screens/shot-catalog.png`.

**Layout**
- Left card: category list with item counts, plus an "Add category" field
- Right card: search and a table of items with name, category, unit, times quoted, last price
  quoted, remove
- Header buttons: Import from Excel, + Add item

**Import from Excel card**
- Upload .xlsx or .csv, or paste rows copied from Excel
- These are the expected columns; the header row is optional. Duplicates are skipped, and a
  summary toast shows the added and skipped counts:

```csv
Category,Item,Unit
TV & Mounting,TV Wall Mount (Full Motion),each
Construction Supplies,Drywall Sheets,sheet
Labor & Fees,Hourly Labor,hour
```

**Add item form (modal):** item or service name, category (pick or type new), unit (each, hour,
sq ft, linear ft, room, sheet, box, gallon, tube, set, load).

## Page 8: Settings

Settings sits in the top nav and avatar menu and is split into small white cards. Screen:
`docs/screens/shot-settings.png`.

| Card | Fields |
| --- | --- |
| Business profile | Business name, logo, phone, email, address (shown on printed quotes) |
| Quotes | Default tax %, currency symbol, quote number start, default quote notes and footer |
| Team | Staff members with name, role (Owner, Staff) and avatar, used on job cards |
| Appearance | Match device, Light, Dark |
| Data | Export customers, jobs and transactions to CSV; reset sample data; clear all data |

## Shared behavior and data

**Modals used across pages:**
- New / edit customer
- New job
- Record revenue or log expense
- Add catalog item
- Photo viewer
- Quote preview
- Confirm delete

All are white cards with a 20 px radius over a dimmed canvas. Escape or tapping outside closes
them.

**States:**
- Every list has an empty state with one clear action.
- Errors say what went wrong and how to fix it.
- Confirmations appear in the dark floating toast.

**Mobile behavior**
- The top pill nav becomes a bottom tab bar (Home, Customers, Quotes, Books, More)
- The icon rail folds into the More menu
- Card rows stack into one column; the pastel job cards scroll sideways
- The quote builder shows Quick add above the quote sheet
- Photo upload opens the phone camera directly

**Data model**

| Record | Key fields | Linked to |
| --- | --- | --- |
| Customer | name, type, phone, email, address, notes, status, created date | Jobs, Photos, Quotes, Transactions |
| Job | title, category, stage, scheduled date, crew, notes | Customer, Quote, Photos |
| Photo | image, stage (Before / During / After), caption, date, uploaded by | Customer, Job |
| Quote | number, date, status, line items, tax %, discount, notes | Customer, Job, Transactions |
| Line item | name, category, unit, quantity, price | Quote, Catalog item |
| Catalog item | name, category, unit | Line items |
| Transaction | type (revenue / expense), amount, date, category, description | Customer, Quote |
| Team member | name, role, avatar | Jobs |
