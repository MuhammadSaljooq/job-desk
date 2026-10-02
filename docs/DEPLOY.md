# Deploying JobDesk (Vercel + Neon)

Hosting decision D21: **Vercel + Neon Postgres**.

|                 |                                                                               |
| --------------- | ----------------------------------------------------------------------------- |
| Vercel project  | [`test11-123f/job-desk-dylan`](https://vercel.com/test11-123f/job-desk-dylan) |
| GitHub repo     | `MuhammadSaljooq/job-desk` (private), production branch `main`                |
| Production URL  | `https://job-desk-dylan.vercel.app` (until a custom domain is added)          |
| Function region | `iad1`, Washington DC (`vercel.json`), so put the database in **US East** too |

What the repo already does for you:

- `pnpm install` runs `prisma generate` (postinstall).
- Vercel runs the `vercel-build` script: `prisma migrate deploy && next build`. **Every deploy
  applies new migrations first**, and a failed migration stops the deploy.
- Migrations use `DATABASE_URL_UNPOOLED` (direct) when it's set, and the app uses
  `DATABASE_URL` (pooled), with at most 5 connections per server instance.
- If `APP_URL` is missing, OAuth redirects fall back to the Vercel production domain.
- The demo seed refuses to run in production, and dev-only storage and dev pages are off.

---

## 1. Connect the GitHub repo

1. Open **Vercel → job-desk-dylan → Settings → Git → Connect Git Repository**.
2. Pick **GitHub → `MuhammadSaljooq/job-desk`**. The repo is private and owned by a different
   GitHub account than the Vercel team, so allow the Vercel GitHub app to access it if asked.
3. Production branch: `main`.
4. Leave Framework (Next.js), Install Command and Build Command on their defaults. Vercel
   finds `vercel-build` by itself. Node.js version: **24.x**. `engines` in package.json is
   `>=22 <25`, so a new major Node version is never picked up by surprise.

## 2. Add the database (Neon)

1. **Vercel → job-desk-dylan → Storage → Create Database → Neon** (Marketplace).
2. Region: **US East (N. Virginia / Washington)**, to match `iad1`.
3. Connect it to the project for **Production** and **Preview**.
4. Turn on **"Create a database branch for each preview deployment"**. Previews run
   migrations too, and without branching they would migrate the production database.
5. This adds `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) to the project. Keep
   both. If the integration names them differently, add these two names yourself.

## 3. Environment variables

**Vercel → Settings → Environment Variables.** Set these for **Production**. Give Preview its
own values (never the production secrets).

| Name                                       | Value                                                                                                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_SECRET`                              | `openssl rand -base64 32`                                                                                                                                                           |
| `TOKEN_ENCRYPTION_KEY`                     | `openssl rand -base64 32`. **Never change it after storage is connected**: it encrypts the Drive / Dropbox tokens, and a new key makes them unreadable, so you'd have to reconnect. |
| `APP_URL`                                  | `https://job-desk-dylan.vercel.app` (or the custom domain, no trailing slash)                                                                                                       |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from step 6                                                                                                                                                                         |
| `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`    | from step 7                                                                                                                                                                         |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`    | set by Neon in step 2                                                                                                                                                               |

Do **not** set `STORAGE_DEV_LOCAL` (development only, and refused in production anyway).
`DB_POOL_MAX` is optional (default 5).

## 4. First deploy

Push to `main`, or **Deployments → Redeploy** after setting the variables. In the build log
you should see `All migrations have been successfully applied`, then the Next.js build.

## 5. Create the business and the owner (once)

Run this from your machine against the production database. Copy `DATABASE_URL_UNPOOLED` from
**Vercel → Settings → Environment Variables** (or the Neon console):

```bash
DATABASE_URL_UNPOOLED="postgresql://…neon.tech/…?sslmode=require" \
  pnpm setup:prod --business "Dylan's Home Services" --name "Dylan" --email dylan@example.com \
  --timezone America/New_York
```

This creates the business, the owner and the 44-item starter catalog (no demo customers or
money), and prints a **one-time temporary password**. It refuses to run if a business already
exists.

Then:

1. Sign in at the production URL. You'll be asked to choose your own password.
2. Open **Settings** and fill in the business profile, tax, currency and timezone. Add the
   team under **Team** (each person gets a temporary password to change on first sign in).
3. Replace the starter catalog with Dylan's Excel list when it arrives (**Catalog → Import from
   Excel**).

## 6. Google Drive

In the [Google Cloud console](https://console.cloud.google.com/), in one project:

1. **APIs & Services → Library → Google Drive API → Enable.**
2. **OAuth consent screen**: External, with the app name, support email and logo. Scopes:
   `openid`, `email`, `…/auth/drive.file`. JobDesk only sees files it created itself.
3. **Credentials → Create OAuth client ID → Web application.** Authorized redirect URI:
   `https://job-desk-dylan.vercel.app/api/storage/callback/google`. Keep
   `http://localhost:3210/api/storage/callback/google` for development if you like.
4. Put the client ID and secret in Vercel (step 3) and redeploy.
5. **Publishing status → In production.** While it's in "Testing", only listed test users can
   connect, and their access expires after 7 days.

## 7. Dropbox

In the [Dropbox App Console](https://www.dropbox.com/developers/apps):

1. **Create app → Scoped access → App folder** (photos stay in `Apps/<app name>/JobDesk`).
2. **Permissions**: `files.content.read`, `files.content.write`, `files.metadata.read`,
   `account_info.read`, then **Submit**. All four are needed; connecting fails without them.
3. **Settings → OAuth 2 → Redirect URIs**:
   `https://job-desk-dylan.vercel.app/api/storage/callback/dropbox`.
4. Put the app key and secret in Vercel (step 3) and redeploy.
5. A development app works for up to 50 connected users. Apply for **production status**
   (Settings → Production) before more businesses use it.

Then **Settings → Photo storage → Connect Google Drive** (or Dropbox) in the app.

## 8. Custom domain (optional)

**Vercel → Settings → Domains → Add.** Then update `APP_URL` and the Google and Dropbox
redirect URIs to the new domain, and redeploy.

---

## Day to day

- **Ship**: merge or push to `main`. Vercel builds, applies migrations, then switches traffic.
- **Preview**: every other branch or PR gets its own URL and its own Neon branch. Google and
  Dropbox only allow the registered redirect URLs, so connecting storage works on production
  (and localhost), not on previews.
- **Roll back**: Vercel → Deployments → Instant Rollback. It rolls back the code, **not the
  database**. JobDesk's migrations only add columns or tables, so older code keeps working
  with a newer schema. Keep it that way: never drop or rename a column in the same release
  that stops using it.
- **Backups**: Neon keeps point-in-time history (the window depends on the plan). Photos live
  in the owner's Drive / Dropbox, not in the database.

## Troubleshooting

| Symptom                                                           | Cause / fix                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Build fails at `prisma migrate deploy` with P1001 / P1012         | The database variables are missing for that environment (Production / Preview).                  |
| Migration hangs or errors with a pooler message                   | `DATABASE_URL_UNPOOLED` isn't set, so migrations went through the pooler.                        |
| Sign in returns to the login page                                 | `AUTH_SECRET` is missing or changed. Set it and redeploy (everyone signs in again).              |
| Google `redirect_uri_mismatch`, or Dropbox "Invalid redirect_uri" | `APP_URL` and the registered redirect URI differ (check https and no trailing slash).            |
| "This provider isn't set up yet" in Settings                      | The Google or Dropbox keys aren't set for Production, or no redeploy happened after adding them. |
| Photos stop loading after changing `TOKEN_ENCRYPTION_KEY`         | Change it back, or reconnect storage in Settings.                                                |
