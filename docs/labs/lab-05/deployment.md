# CPMS Deployment (Lab 5)

Status: **draft** — covers Issues #8 (cloud-ready) and #9 (Docker). GCP, CI and release sections are
filled in by Issues #10–#15.

## 1. Stack and changes from the reference kit

| Item | CPMS | Starter kit (TokTickIT) | Why |
|---|---|---|---|
| Runtime | Node.js 22 (alpine) | Node.js 24 | Matches the project's `@types/node` 22 and README (>= 20). |
| Layout | One `package.json` at repo root (`src/` API, `client/` SPA) | `server/` and `client/` packages | Existing repo structure. |
| Image | One image serves API + built SPA | Same | — |
| Port | **8080** | 3000 | App default; Cloud Run default. `deploy.sh --port` must be 8080. |
| Local compose | `db` + `migrate` + `app` (one image) | Separate client (nginx) and server images | The SPA is already served by Express; a second web image is not needed. |
| Entrypoint | Exec-form `CMD ["node","dist/index.js"]`, no shell script | `docker-entrypoint.sh` | Same PID-1 behaviour; avoids CRLF problems on Windows. |
| Auth sessions | Stateless JWT in an httpOnly cookie | Sessions in DB | Nothing session-related lives in the container. |
| Uploads | None (submissions store a link) | Files in DB | Nothing user-generated lives in the container. |

**Staging branch:** the staging/integration branch of the current sprint is `sprint-NN` (Lab 5: `sprint-01`).
Feature/fix branches → PR into `sprint-NN` (teammate review) → release PR into `main` → deploy.

## 2. Environment variables

All placeholders are in [`.env.example`](../../../.env.example). `.env` is git-ignored and never committed.

| Variable | Purpose | Secret? | Local value from | Cloud value from |
|---|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | `.env` (compose builds it from `POSTGRES_*`) | Secret Manager |
| `JWT_SECRET` | Signs session cookies. App refuses to start in production if empty or a known placeholder | **Yes** | `.env` (random value) | Secret Manager |
| `JWT_EXPIRES_IN` | Session lifetime (default `8h`) | No | `.env` | Cloud Run env var |
| `COOKIE_SECURE` | `Secure` cookie flag: `false` on http://localhost, **`true` on Cloud Run** | No | `.env` | Cloud Run env var |
| `UNIVERSITY_EMAIL_DOMAIN` | Allowed student e-mail domain | No | `.env` | Cloud Run env var |
| `PORT` | Listen port (default 8080) | No | `.env` / compose | Injected by Cloud Run |
| `NODE_ENV` | `production` in the image | No | Dockerfile | Dockerfile |
| `DEMO_USER_PASSWORD` | Password of all seeded demo accounts (Lab 6 UAT); also used by the tests | **Yes** (cloud) | `.env` | Secret Manager (migration job only) |
| `SEED_RESET` | `true` wipes all tables before seeding | No | `.env` (local only) | **Never set** |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Local compose database | Password: yes | `.env` | Not used (Cloud SQL) |

Demo account e-mails are listed in the README; their password is shared with the Lab 6 partner team
privately and never shown on screen. The former "Demo Quick Login" buttons, which filled in the
password from the client code, were removed.

## 3. Commands

| Task | Command |
|---|---|
| Install | `npm ci && npx prisma generate` |
| Build | `npm run build` (Vite → `dist/public`, tsc → `dist/`) |
| Test (needs a DB) | `npm test` (Vitest + Supertest), `npm run test:e2e` (Playwright) |
| Migrate | `npx prisma migrate deploy` |
| Seed | `npm run prisma:seed` — skips if users exist; `SEED_RESET=true` to wipe locally |
| Run locally | `npm run dev` |
| Run in Docker | `cp .env.example .env` (set `JWT_SECRET`), `docker compose up --build` → http://localhost:8080 |
| Build image only | `docker build -t cpms .` |
| Health | `GET /api/health` (process up), `GET /api/ready` (database reachable, 503 otherwise) |

The migration job (local `migrate` service, and the Cloud Run job later) runs
`npx prisma migrate deploy && npm run prisma:seed` from the same image. Because the seed is
non-destructive, it is safe on every release; keep migrations additive.

## 4. Verification so far (local)

Run on a copy of the working tree containing only git-tracked/untracked-but-not-ignored files,
with `.env` made from `.env.example` (`JWT_SECRET` set to a random value):

| Check | Result |
|---|---|
| `docker compose up --build` | db healthy → migrate (migrate deploy + seed) exited 0 → app started as user `node` |
| `/api/health`, `/api/ready`, `/` | `{"status":"ok"}`, `{"status":"ready"}`, SPA served |
| Sign in as a seeded supervisor, list projects | 200, project returned |
| Create a milestone, `docker compose restart app` | Milestone still present |
| `docker compose down` + `up --build` (migrate + seed re-run) | Milestone still present; seed logged "already contains users; skipping" |
| Start image with `NODE_ENV=production` and no `JWT_SECRET` | Refuses to start |
| Image env / files | Only `NODE_ENV`, `TZ`, `PORT`; no `.env` in the image |
| `npm test` (Vitest) against PostgreSQL 16 | 54/54 passed |
| `npm run test:e2e` (Playwright, Chromium) | 2/2 passed |
| Built client bundle | Contains no demo password |

These are pre-merge local checks. The C-03 evidence for the PDF must be redone with a real
`git clone` of the merged commit, recording its SHA.

## 5. GCP resources

_TBD (Issue #11): project ID, region (`asia-southeast1`), Artifact Registry repo, Cloud Run service,
migration job, Cloud SQL instance/database, secrets, service accounts._

## 6. Release procedure and finding the running commit

_TBD (Issues #13, #14)._
