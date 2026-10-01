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
- Wrote `docs/seed-data.md` with the 44-item sample catalog and sample records, built from the POC plus
  the screenshots.
- Saved the POC as `docs/reference/poc-field-service-workspace.html`
  (https://claude.ai/artifact/LdKaGofBKfV1YwfiTen8UB).

## Phase 0: plan (2026-10-01)
- Wrote `docs/PLAN.md`:
  - a product summary
  - 15 routes with their components
  - the Prisma data model
  - the 12 phases
  - decisions D1–D21 (section 5)
- Resolved all 21 open questions with the user. Main choices:
  - keep team features
  - owner-created staff accounts
  - in-app notifications only
  - Dylan sends quote PDFs himself
  - block quotes that have unpriced lines
  - one date per job
  - a business timezone setting
  - bcryptjs for password hashing
  - latest stable Next.js, if every library supports it
- Still waiting on Dylan:
  - his Excel item list
  - business name, logo, address, tax rate and timezone
  - who on the team will use the system
- Hosting (D21) gets decided before phase 11.

## External setup still needed (by you)
- Google Cloud OAuth client: Drive API, scope `drive.file`, redirect
  `http://localhost:3000/api/storage/callback/google`.
- Dropbox scoped app: `files.content.read` and `files.content.write`, redirect
  `http://localhost:3000/api/storage/callback/dropbox`.
- Docker Desktop, for local Postgres.

## Next
Phase 1: scaffold and design system (`docs/prompts/01-scaffold-design-system.md`). First, check the latest
stable versions and their compatibility (D20), and report them before installing.
