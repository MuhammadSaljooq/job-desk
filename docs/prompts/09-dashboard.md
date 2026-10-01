# Phase 9: Dashboard

Phase 9. Dashboard (/, docs/screens/shot-dashboard.png).

- Row 1: owner card (business name, quick buttons New quote, New customer,
  New job, Log expense, today's date, "N jobs today") + "Ongoing jobs"
  dropdown pill and a horizontal strip of pastel JobCards (not completed,
  nearest date first)
- Row 2: This month card (revenue, expenses, net + margin pill, open quotes
  value, active jobs), CalendarCard for the month with chips colored by job
  stage and today outlined (click a day to list its jobs in a sheet),
  Activity InboxCard (latest 6, newest unread as the black row, View all)
- Row 3: pipeline board (columns by stage, stage select on each card),
  money in vs out bar chart for the last 6 months (Recharts), latest 6 photos
- Breadcrumb filters: stage pill and month picker drive rows 1 and 2
- Load each card with its own Suspense boundary and skeleton
