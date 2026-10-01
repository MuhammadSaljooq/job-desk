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
- Wrote `docs/seed-data.md` with the 46-item catalog and sample records, built from the POC plus
  the screenshots.
- Saved the POC as `docs/reference/poc-field-service-workspace.html`
  (https://claude.ai/artifact/LdKaGofBKfV1YwfiTen8UB).

## Known gaps and open questions (feed these into Phase 0)
1. **Team or solo?** There's an open comment on the page spec: "Does the client have staff,
   or is it a one person business so we can drop these [crew avatars and Team card]?" The
   client overview also asks Dylan "whether anyone else on your team will be using the system".
   The answer is still unknown. Until then, build for Owner + Staff.
2. **Dylan's real item list** (an Excel file) hasn't arrived yet. Seed the 46-item sample
   catalog for now. The importer (phase 6) will load his file.
3. **Business details** are still unknown: name, logo, address and tax rate. Seed "Your
   Company" and 8% for now.
4. **Quotes KPI cards**: the spec says Drafts / Sent / Accepted / Declined. The screenshot and
   phase 7 prompt say Drafts / Sent / Accepted / **Unpaid balance**. Plan: follow the
   screenshot and prompt.
5. **The "Unpaid balance" in shot-quotes.png ($1,441.80) leaves out the deposits.** The correct
   figure for that data is $841.80. Plan: compute accepted total − linked income.
6. **Storage card** (Drive / Dropbox connect) is in phase 10 but not in the spec's Settings
   table. Notification toggles appear in the screenshot but not in the spec. Plan: follow the
   prompts.
7. **Role label**: the screenshot shows "Technician", but the schema role is OWNER | STAFF.
   Proposal: show "Technician" as the display label for STAFF, or add a free-text job title.
8. **Profile card buttons**: the spec says "message, call, directions, video", but the
   screenshot shows message, call, directions, email. Plan: follow the screenshot (email).
9. **Header tools**: the spec mentions a "messages" button, but the screenshot shows "+". Plan:
   follow the screenshot (+ New menu).
10. **Catalog count**: the POC seeds 44 items, while the screenshots say 46. Two items are
    proposed in seed-data.md.
11. **Hosting** (Vercel + Neon or AWS) gets decided in phase 11.

## External setup still needed (by you)
- Google Cloud OAuth client: Drive API, scope `drive.file`, redirect
  `http://localhost:3000/api/storage/callback/google`.
- Dropbox scoped app: `files.content.read` and `files.content.write`, redirect
  `http://localhost:3000/api/storage/callback/dropbox`.
- Docker Desktop, for local Postgres.

## Next
Phase 0: `docs/PLAN.md` (no code).
