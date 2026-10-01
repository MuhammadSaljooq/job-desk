# Phase 4: Customers and jobs

Phase 4. Customers list and customer profile, following the Customers and
Customer profile sections of docs/page-spec.md and docs/screens/
shot-customers.png + shot-profile.png.

Customers list (/customers):
- Card grid (3 / 2 / 1 columns), search by name, phone, address (debounced,
  URL param), filter pill: All, Active jobs, No jobs, Owes money
- Card: avatar initials, name, address, latest job + stage pill, job count,
  photo count, call / text / directions buttons (tel:, sms:, maps link)
- New customer dialog (React Hook Form + Zod), edit, delete with confirm

Customer profile (/customers/[id]):
- Row 1: ProfileCard (message, call, directions, email buttons, customer
  since, status) + horizontal strip of pastel JobCards for this customer
- Row 2: Customer details (DetailRow list with copy / call / map actions),
  Job schedule (CalendarCard with this customer's visits), Notes and messages
  (InboxCard: add a note, show Activity for this customer)
- Summary strip: jobs, photos, accepted work, paid to date, balance owed
- Tabs as routes: Jobs | Job site photos | Quotes | Payments
- Jobs tab: list with inline stage select, date, assignees, notes, add /
  edit / delete job dialog. Changing a stage writes an Activity row

Job card progress: Lead 10, Quoted 30, Scheduled 50, In Progress 75,
Completed 100. Card color: Scheduled sky, In Progress peach, overdue
(scheduled date passed and not completed) blush, Completed mint.
Add Playwright tests: create customer, add job, move it to Completed.
