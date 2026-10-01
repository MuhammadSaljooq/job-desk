# Seed data

Source for `prisma/seed.ts` (phase 2). It comes from the JobDesk POC
(`docs/reference/poc-field-service-workspace.html`, the `CAT_SEED` and `seed()` blocks), plus a
few details that appear only in `docs/screens/`. Dates are relative to the day the seed runs.
"d-3" means 3 days ago and "d+3" means 3 days from now. All money below is in dollars for
readability; store it as integer cents. Tax is 8% (800 bps) everywhere.

## Business
| Field | Value |
|---|---|
| name | Your Company |
| tagline (ProfileCard subtitle) | Handyman and home repair |
| phone | (555) 100-2000 |
| email | hello@yourcompany.com |
| address | (empty; the Settings card says "Shown on printed quotes") |
| currency | USD ($) |
| taxRateBps | 800 |
| nextQuoteNumber | 1007 (quotes Q-1001 to Q-1006 exist) |
| quoteFooter | Thank you for the opportunity |

## Team
| Name | Role | Shown as | Initials | Avatar color |
|---|---|---|---|---|
| Owner account | OWNER | Owner | ME | #2D3436 |
| Jordan Reyes | STAFF | Technician | JR | #D09A36 |
| Alex Lin | STAFF | Technician | AL | #3F8F93 |

## Catalog: 9 categories, 46 items, no prices
| # | Category | Items (unit) |
|---|---|---|
| 1 | TV & Mounting | TV Wall Mount (Fixed / Tilt) (each); TV Wall Mount (Full Motion) (each); Soundbar Mount (each); In-Wall Cable Concealment (each); Floating Shelf Install (each); Mirror / Artwork Hanging (each) |
| 2 | Electrical | Light Fixture Install (each); Ceiling Fan Install (each); Outlet / Switch Replacement (each); Dimmer Switch Install (each); Smart Doorbell Install (each); Smart Thermostat Install (each) |
| 3 | Plumbing | Faucet Replacement (each); Toilet Repair / Replace (each); Garbage Disposal Install (each); Leak Repair (each); Showerhead Replacement (each) |
| 4 | Drywall & Carpentry | Drywall Patch (Small) (each); Drywall Patch (Large) (each); Door Install / Adjust (each); Trim & Baseboard (linear ft); Cabinet Hardware Install (set) |
| 5 | Painting | Interior Wall Painting (room); Ceiling Painting (room); Paint Touch-ups (hour); Exterior Trim Painting (linear ft) |
| 6 | Assembly | Furniture Assembly (each); Bed Frame Assembly (each); Desk / Office Assembly (each); Outdoor Furniture / Grill (each) |
| 7 | Flooring & Tile | Tile Repair (sq ft); Laminate / Vinyl Plank Install (sq ft); Grout & Caulk Refresh (room) |
| 8 | Construction Supplies | Drywall Sheets (sheet); Joint Compound (box); Lumber (each); Screws & Anchors (box); Paint & Primer (gallon); Caulk / Sealant (tube); Mounting Hardware Kit (each) |
| 9 | Labor & Fees | Hourly Labor (hour); Service Call / Trip Fee (each); Haul-Away / Disposal (load); After-Hours Surcharge (each) |

Counts are 6 + 6 + 5 + 5 + 4 + 4 + 3 + 7 + 4 = 44, plus the two below = 46. Two items appear in
the screenshots but not in `CAT_SEED`. Add them so the count matches the "46 items" shown in
shot-builder.png and shot-catalog.png:
- Assembly: "Shelving / Bookcase Assembly" (each). This is a proposal; the screenshots don't
  name the missing items.
- Construction Supplies: "Cable / Wire Kit" (each). This is also a proposal.

## Customers (6)
| Key | Name | Type | Phone | Email | Address | Access notes | Preferred contact | Since |
|---|---|---|---|---|---|---|---|---|
| c1 | Sarah Mitchell | HOMEOWNER | (555) 214-8890 | sarah.mitchell@email.com | 142 Maple Ave | Friendly dog on site, side gate | Texts, after 5 pm | Aug 2026 (d-62) |
| c2 | David Chen | HOMEOWNER | (555) 381-2207 | dchen@email.com | 88 Harbor View Dr, 4B | Condo building. Book the service elevator a day ahead. | | d-40 |
| c3 | Oakwood Property Mgmt | LANDLORD | (555) 600-4410 | maintenance@oakwoodpm.com | 2200 Oakwood Blvd | Multi-unit landlord, 14 units. Send invoices to the office email. Keys at the office. | | Apr 2026 (d-150) |
| c4 | Priya Patel | HOMEOWNER | (555) 742-1934 | priya.p@email.com | 17 Birch Lane | | | d-8 |
| c5 | Marcus Johnson | HOMEOWNER | (555) 918-3302 | mjohnson@email.com | 403 Cedar St | Referred by Sarah Mitchell. | | d-2 |
| c6 | Alvarez Family | HOMEOWNER | (555) 455-0192 | alvarez.home@email.com | 9 Willow Ct | | | d-90 |

c6 appears only in the screenshots, so its phone and email are made up.

## Jobs (10, covering every stage)
| Key | Customer | Title | Category | Stage | Scheduled | Assignees | Notes |
|---|---|---|---|---|---|---|---|
| j1 | c1 | Living room TV mount | TV & Mounting | COMPLETED | d-24 | JR | 65" TV, stud mounted. Customer supplied TV. |
| j2 | c1 | Hallway drywall and paint | Drywall & Paint | SCHEDULED | d+3 | JR, AL | Bring 2 sheets of drywall and primer |
| j3 | c2 | Bedroom TV mount | TV & Mounting | IN_PROGRESS | today | DC*, JR | Concrete wall, bring masonry anchors. |
| j4 | c3 | Unit 12 turnover repairs | Repairs | IN_PROGRESS (overdue in the screenshots) | d-2 | ME, JR, AL | Tenant moved out. Keys at the office. |
| j5 | c3 | Unit 7 light fixtures | Electrical | COMPLETED | d-40 | AL | |
| j6 | c4 | Home office assembly | Assembly | QUOTED | d+1 | | |
| j7 | c5 | Kitchen faucet and disposal | Plumbing | LEAD | today | | Called in, wants a quote this week. |
| j8 | c2 | Floating shelves in living room | TV & Mounting | LEAD | d+1 | | |
| j9 | c1 | Kitchen lights | Electrical | QUOTED | d+15 | AL | Awaiting reply on Q-1006 |
| j10 | c6 | Ceiling fan install | Electrical | COMPLETED | d-20 | JR | |

\* The dashboard screenshot shows a "DC" avatar on a job card. Treat it as a placeholder and
assign team members only.

## Quotes (6)
| # | Customer | Job | Date | Status | Lines (qty × price) | Total incl. 8% |
|---|---|---|---|---|---|---|
| Q-1001 | c1 | j1 | d-30 | ACCEPTED | TV Wall Mount (Full Motion) 1×149; In-Wall Cable Concealment 1×129; Mounting Hardware Kit 1×35 | $338.04 |
| Q-1002 | c3 | j4 | d-6 | ACCEPTED | Drywall Patch (Large) 2×145; Interior Wall Painting 1×320; Outlet / Switch Replacement 4×45; Joint Compound 1×18; Paint & Primer 2×42; Hourly Labor 3×75 | $1,206.36 |
| Q-1003 | c4 | j6 | d-2 | SENT | Desk / Office Assembly 2×95; Furniture Assembly 3×65; Haul-Away / Disposal 1×60 | $480.60 |
| Q-1004 | c2 | j3 | d-5 | ACCEPTED | TV Wall Mount (Full Motion) 1×149; Soundbar Mount 1×69 | $235.44 |
| Q-1005 | c5 | j7 | today | DRAFT | Faucet Replacement 1×(empty); Garbage Disposal Install 1×(empty) | $0.00 |
| Q-1006 | c1 | j9 | today | DRAFT | Light Fixture Install 3×85; Ceiling Fan Install 1×(empty); Mounting Hardware Kit 1×35; Service Call / Trip Fee 1×40 | $356.40 once the fan is priced |

Quote notes:
- Q-1001: "Full motion bracket mounted into studs, with in-wall power and cable kit. Customer
  supplies the TV."
- Q-1002: "Patch and paint living room, replace four damaged outlets and switches."
- Q-1003: "Two desks and three bookshelves. Boxes and packaging hauled away."
- Q-1006: "Replace three kitchen ceiling lights and install the new ceiling fan. Customer
  supplies fixtures and fan."

The Q-1006 total of $356.40 in shot-builder.png only adds up if Ceiling Fan Install is
$0 (255 + 35 + 40 = 330 × 1.08). Seed it with an empty price, as the screenshot shows.

Expected payment state: Q-1001 Paid, Q-1002 Part paid ($500 of $1,206.36), Q-1004 Part paid
($100 of $235.44). Unpaid balance = $706.36 + $135.44 = $841.80.

The quotes-list screenshot says $1,441.80. That is $1,206.36 + $235.44, the two quote totals
with neither deposit taken off. The screenshot is wrong: unpaid balance = accepted total − income
linked to the quote. Use the computed $841.80. (The other KPI checks out: "Accepted 3, $1,779.84"
= 338.04 + 1,206.36 + 235.44.)

## Transactions (22, over about 5 months)
| Type | Amount | When | Category | Description | Customer | Quote |
|---|---|---|---|---|---|---|
| INCOME | 338.04 | d-22 | Job Payment | Payment for Q-1001 | c1 | Q-1001 |
| INCOME | 640.00 | d-38 | Job Payment | Unit 7 light fixtures | c3 | |
| INCOME | 500.00 | d-3 | Deposit | Deposit for Q-1002 | c3 | Q-1002 |
| INCOME | 100.00 | d-1 | Deposit | Deposit for Q-1004 | c2 | Q-1004 |
| INCOME | 980.00 | d-55 | Job Payment | Unit 3 repairs | c3 | |
| INCOME | 1150.00 | d-70 | Job Payment | Kitchen backsplash repair | | |
| INCOME | 880.00 | d-95 | Job Payment | Deck board replacement | | |
| INCOME | 1420.00 | d-120 | Job Payment | Basement drywall finishing | | |
| INCOME | 760.00 | d-150 | Job Payment | Bathroom fixtures refresh | | |
| EXPENSE | 186.40 | d-3 | Materials | Drywall, compound and screws | c3 | |
| EXPENSE | 62.10 | d-6 | Fuel & Vehicle | Fuel | | |
| EXPENSE | 29.00 | d-10 | Software | Scheduling app subscription | | |
| EXPENSE | 139.99 | d-15 | Tools & Equipment | Stud finder and laser level | | |
| EXPENSE | 88.25 | d-25 | Materials | Mount hardware and cable kit | c1 | |
| EXPENSE | 145.00 | d-28 | Insurance | General liability, monthly | | |
| EXPENSE | 75.00 | d-45 | Marketing | Door hanger flyers | | |
| EXPENSE | 145.00 | d-58 | Insurance | General liability, monthly | | |
| EXPENSE | 58.00 | d-60 | Fuel & Vehicle | Fuel | | |
| EXPENSE | 240.00 | d-72 | Materials | Tile and grout | | |
| EXPENSE | 300.00 | d-100 | Subcontractor | Licensed electrician, panel work | | |
| EXPENSE | 190.00 | d-125 | Materials | Drywall sheets | | |
| EXPENSE | 70.00 | d-140 | Fuel & Vehicle | Fuel | | |

## Activity (newest first)
| Type | Message | Customer | When | Read |
|---|---|---|---|---|
| QUOTE_ACCEPTED | Quote Q-1004 accepted. David Chen accepted the bedroom TV mount quote | c2 | d-0 09:40 | no |
| PHOTO_UPLOADED | Photo uploaded. 2 During photos added to Unit 12 turnover | c3 | d-0 09:12 | no |
| PAYMENT_RECORDED | Payment recorded. $338.04 for Q-1001, paid in full | c1 | d-22 | yes |
| NEW_LEAD | New lead. Marcus Johnson wants a faucet and disposal quote | c5 | d-2 | yes |
| QUOTE_SENT | Quote sent. Q-1003 office furniture assembly, $480.60 | c4 | d-2 | yes |
| NOTE | Customer note. "Can you also look at the kitchen lights while you're here?" | c1 | d-3 | yes |
| NOTE | Job note. Bring 2 sheets of drywall and primer on Friday | c1 | d-4 | yes |

## Photos (sample rows only)
Photos live in Google Drive or Dropbox, so the seed can't create real files. Use the fake
storage provider (`src/lib/storage/fake.ts`) with placeholder SVGs in dev, or seed no photos.
These are the captions from the screenshots and the POC:
- c3 / j4: Before "Hole behind the door", Before "Living room wall", During "Patch set, ready for
  mud", During "Ceiling prep", During "Second coat"
- c3 / j5: After "New fixture in the entry", After "Hallway pendant"
- c1 / j1: Before "Bare wall, outlet location marked", After "TV mounted, cables hidden"
- c2 / j3: Before "Bedroom wall", During "Bracket going up"
