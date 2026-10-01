# Phase 3: Auth and the app shell

Phase 3. Add sign in and the app shell that every page uses.

- Auth.js v5 with the Prisma adapter: email + password for now, magic link
  ready for later. /login page styled like the rest of the app
- Middleware protects everything under (app); session includes userId,
  businessId and role
- src/lib/auth.ts helper requireUser() used by every server action and query
- (app)/layout.tsx shell matching docs/screens:
  - top bar: two round buttons on the left, centered white pill nav
    (Home, Customers, Quotes, Books) with the active tab as a black pill,
    right side: + New menu, notifications bell with unread dot, search,
    avatar menu (Settings, Sign out)
  - floating dark icon rail on the left: Home, Activity, Customers,
    Catalog, Calendar, Photos, Settings
  - Breadcrumb component: back arrow + title + right slot for filter pills
  - Sonner toasts styled as the dark floating pill
- Below 768px: pill nav becomes a bottom tab bar, the rail moves into a
  More sheet
- Global search (Cmd+K) across customers, jobs and quotes
- Placeholder pages for every route so navigation works end to end
