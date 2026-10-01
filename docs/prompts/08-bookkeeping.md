# Phase 8: Bookkeeping

Phase 8. Bookkeeping (/books, docs/screens/shot-books.png).

- Breadcrumb: month picker (All time or a month, URL param), Log expense,
  Record revenue
- KPI cards: Revenue (count), Expenses (count), Net profit, Profit margin %
- Transactions table: filter All / Revenue / Expenses, date, description,
  category pill, customer, amount (green + / red -), edit, delete
- Right column: "Where the money went" and "Where it came from" horizontal
  bars by category
- Transaction dialog: Revenue / Expense switch (swaps the category list),
  amount, date, category, description, optional customer, optional quote
  Revenue: Job Payment, Deposit, Other Income
  Expense: Materials, Tools & Equipment, Fuel & Vehicle, Subcontractor,
  Insurance, Marketing, Software, Other
- Customer profile Payments tab and quote paid status read from this table
- All sums done in SQL (Prisma groupBy / aggregate), not in the browser
- Export the current view to CSV
