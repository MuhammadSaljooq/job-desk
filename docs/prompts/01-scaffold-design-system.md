# Phase 1: Scaffold and design system

Phase 1. Scaffold the project and build the design system. No business features yet.

- Create a Next.js 15 app (App Router, TypeScript strict, Tailwind v4, ESLint,
  src/ dir, pnpm) in the current folder
- Add Prettier, Husky + lint-staged, and scripts: dev, lint, typecheck, test,
  test:e2e, db:migrate, db:seed, db:studio
- Install and init shadcn/ui; add Button, Input, Select, Dialog, Sheet, Tabs,
  DropdownMenu, Badge, Tooltip, Sonner (toasts), Calendar, Table, Form
- Load Plus Jakarta Sans with next/font
- Put all design tokens from CLAUDE.md in src/app/globals.css as CSS variables
  and map them into Tailwind
- Build the shared components in src/components/shared/ exactly like
  docs/screens: ProfileCard, JobCard (pastel, progress bar, avatar stack,
  days left chip), DetailRow, CalendarCard, InboxCard, StatusPill, KpiCard,
  EmptyState
- Create a /dev/components page that shows every component with sample props
  so I can compare them to the screenshots

Use the Playwright MCP to screenshot /dev/components and compare it with
docs/screens/shot-profile.png. Fix visible differences, then update PROGRESS.md.
