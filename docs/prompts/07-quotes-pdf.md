# Phase 7: Fast quotes and PDF

Phase 7. Quotes list and quote builder (docs/screens/shot-quotes.png and
shot-builder.png). Plan first; this is the most important feature.

Quotes list (/quotes): KPI cards (Drafts, Sent, Accepted value, Unpaid
balance), status filter, month picker, table with number, customer, job,
date, total, status pill, payment pill (Paid, Part paid, Unpaid).

Quote builder (/quotes/[id]):
- Left card: search + category pills + item rows. Tap adds a line with
  qty 1 and an EMPTY price; tapping the same item again adds +1 qty. Show
  "last quoted $X" as the price placeholder
- Right card: customer, job title, date; lines with editable name, qty,
  unit price (typed by hand), amount, remove, drag to reorder; + Custom
  line; notes; subtotal, discount, tax %, total
- Autosave (debounced server action), "Saved" indicator
- src/features/quotes/totals.ts: pure function in cents, fully unit tested
  (discount capped at subtotal, tax on subtotal minus discount, rounding)
- Quote numbers come from Business.nextQuoteNumber in a transaction
- Actions by status: Draft (Preview, Mark sent, Declined, Accept), Sent
  (Preview, Declined, Accept), Accepted (Open job, Record payment until paid),
  Declined (Reopen)
- Accept: creates a SCHEDULED job if none is linked, or moves a linked
  Lead / Quoted job to Scheduled; writes Activity; toast
- Record payment: opens the transaction form prefilled (amount = balance,
  Deposit if nothing paid yet, else Job Payment), linked to the quote
- GET /api/quotes/[id]/pdf renders QuoteDocument with @react-pdf/renderer:
  business name and logo, number, date, customer, items, totals, notes, footer
