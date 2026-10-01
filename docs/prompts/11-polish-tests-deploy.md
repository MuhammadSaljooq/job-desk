# Phase 11: Mobile polish, tests and deploy

Phase 11. Make it production ready.

Mobile and polish:
- Check every page at 375px and 768px with the Playwright MCP and fix
  layout issues; job strips scroll sideways; quote builder stacks Quick add
  above the sheet; photo upload opens the camera
- Every list has loading, empty and error states; every destructive action
  confirms; keyboard focus visible; images have alt text
- Add a PWA manifest and icons so Dylan can add it to his home screen

Tests and CI:
- Playwright e2e: sign in, create customer, add job, upload photo, import
  catalog from a sample .xlsx in tests/fixtures, build a quote, accept it,
  record payment, check the dashboard numbers
- .github/workflows/ci.yml: install, lint, typecheck, unit, e2e against a
  Postgres service container

Deploy (ask me which one before starting):
- Option A: Vercel + Neon Postgres
- Option B: AWS: Docker image to ECR, ECS Fargate behind an ALB, RDS
  Postgres, Secrets Manager; Terraform in infra/
- Add the production redirect URLs to the Google Cloud OAuth client and the
  Dropbox app, set the Google consent screen to In production, and apply for
  Dropbox production status
- Run migrations on deploy, seed only the catalog, write docs/DEPLOY.md
