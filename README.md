# JobDesk starter kit

Workflow system for Dylan, built by Higher Next Solutions with Claude Code in VS Code.

## What's in this folder
- CLAUDE.md: project rules Claude Code reads at the start of every session
- docs/page-spec.md: page by page technical spec (export of the Claude Doc
  "JobDesk: Page by Page Product Spec")
- docs/client-overview.md: plain-language overview for Dylan (export of the Claude Doc
  "Your New Workflow System")
- docs/seed-data.md: the 44-item sample catalog and the sample data for prisma/seed.ts
- docs/reference/poc-field-service-workspace.html: the earlier single-file POC (logic and data
  only; its visual style is not the target)
- docs/prompts/: one prompt per build phase (00 to 11) plus fix-up prompts
- docs/screens/: the 9 target screen designs (1440px captured at 1.25x)
- docs/PROGRESS.md: what is done and what is next

## Setup (once)
1. Done: the starter kit is in this repo, and the two Claude Docs are exported to docs/*.md.
2. Create a Google Cloud OAuth client (Drive API, scope drive.file) and a Dropbox
   scoped app (files.content.read/write). Add the keys to .env during phase 2.
3. Optional MCP servers: Context7 (library docs), Playwright (UI checks), GitHub.

## Running the build
- Open Claude Code and paste: `Run the prompt in docs/prompts/00-plan.md`
- Use Plan mode (Shift+Tab) for phases 0, 2, 5 and 7.
- After each phase: run the app, click through it, check docs/prompts/99-fix-ups.md,
  then commit: `git commit -am "phase N: ..."`
- Run /clear between phases. CLAUDE.md and docs/PROGRESS.md carry context forward.

| Phase | File | Delivers |
| --- | --- | --- |
| 0 | 00-plan.md | docs/PLAN.md, no code |
| 1 | 01-scaffold-design-system.md | Next.js app, design tokens, shared components |
| 2 | 02-database-seed.md | Postgres, Prisma schema, sample data |
| 3 | 03-auth-app-shell.md | Sign in, nav, icon rail, mobile tab bar |
| 4 | 04-customers-jobs.md | Customers list, customer profile, jobs |
| 5 | 05-job-site-photos.md | Photos to Google Drive or Dropbox |
| 6 | 06-catalog-excel-import.md | Item list and Excel import |
| 7 | 07-quotes-pdf.md | Quote builder, accept to job, PDF |
| 8 | 08-bookkeeping.md | Revenue and expenses |
| 9 | 09-dashboard.md | Home dashboard |
| 10 | 10-settings-team.md | Settings, team, storage connection |
| 11 | 11-polish-tests-deploy.md | Mobile polish, tests, CI, deploy |

## Tech stack
Next.js 15 (App Router) + TypeScript, Tailwind v4 + shadcn/ui + lucide-react,
Plus Jakarta Sans, React Hook Form + Zod, PostgreSQL 16 + Prisma, Auth.js v5,
Google Drive API or Dropbox API for photos (browser-image-compression on the client),
SheetJS for Excel import, @react-pdf/renderer for quotes, Recharts, date-fns,
Vitest + Playwright, Docker Compose for local Postgres, ESLint/Prettier/Husky,
GitHub Actions. Hosting: Vercel + Neon, or AWS (ECS Fargate + RDS).

## Target folder layout
```text
jobdesk/
├── CLAUDE.md
├── docs/ (client-overview.md, page-spec.md, screens/, prompts/, PLAN.md, PROGRESS.md)
├── docker-compose.yml
├── .env.example
├── prisma/ (schema.prisma, migrations/, seed.ts)
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (app)/ layout.tsx, page.tsx (dashboard), customers/, quotes/,
│   │   │          books/, catalog/, settings/
│   │   ├── api/ auth/, storage/connect|callback|upload-session/,
│   │   │        photos/[id]/file/, quotes/[id]/pdf/
│   │   └── globals.css
│   ├── components/ ui/, shell/, shared/
│   ├── features/ customers/, jobs/, photos/, catalog/, quotes/, books/,
│   │             activity/, settings/
│   └── lib/ db.ts, auth.ts, storage/, crypto.ts, money.ts, utils.ts
├── tests/ unit/, e2e/
└── .github/workflows/ci.yml
```
