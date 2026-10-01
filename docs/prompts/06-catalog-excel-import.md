# Phase 6: Item catalog and Excel import

Phase 6. Item catalog (docs/screens/shot-catalog.png). Remember: the
catalog stores NO prices.

- /catalog: categories card on the left with counts and an Add category
  field; items table on the right with search, unit, times quoted, last
  price quoted (computed from QuoteLine), edit and delete
- Add / edit item dialog: name, category (pick or create), unit
  (each, hour, sq ft, linear ft, room, sheet, box, gallon, tube, set, load)
- Import card: upload .xlsx / .csv or paste rows copied from Excel
  - src/features/catalog/import-excel.ts parses with SheetJS
  - columns Category, Item, Unit; header row optional and detected by name;
    one column files go to Uncategorized; unit defaults to each
  - show a preview table (new / duplicate / invalid) before saving
  - skip duplicates (same name + category, case insensitive)
  - toast: "Imported 38 items, skipped 2 duplicates"
- Vitest tests for the parser: header, no header, one column, blank rows,
  duplicates, extra columns
