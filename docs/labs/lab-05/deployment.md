# CPMS Deployment (Lab 5)

Status: **draft** — covers Issues #8 (cloud-ready), #9 (Docker), #10 (CI) and the deploy files for
#11/#13. Evidence links are added by #14/#15.

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
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | `.env` (compose builds it from `POSTGRES_*`) | Secret Manager `s87d9c6b4-database-url` (made by the course portal) |
| `JWT_SECRET` | Signs session cookies. App refuses to start in production if empty or a known placeholder | **Yes** | `.env` (random value) | Secret Manager `s87d9c6b4-app-secret-1` (team slot 1, value added by us) |
| `JWT_EXPIRES_IN` | Session lifetime (default `8h`) | No | `.env` | Cloud Run env var |
| `COOKIE_SECURE` | `Secure` cookie flag: `false` on http://localhost, **`true` on Cloud Run** | No | `.env` | Cloud Run env var |
| `UNIVERSITY_EMAIL_DOMAIN` | Allowed student e-mail domain | No | `.env` | Cloud Run env var |
| `PORT` | Listen port (default 8080) | No | `.env` / compose | Injected by Cloud Run |
| `NODE_ENV` | `production` in the image | No | Dockerfile | Dockerfile |
| `DEMO_USER_PASSWORD` | Password of all seeded demo accounts (Lab 6 UAT); also used by the tests | **Yes** (cloud) | `.env`; CI generates one per run | Secret Manager `s87d9c6b4-demo-password` (migration job only, with `--demo`) |
| `SEED_DEMO_DATA` | `false` skips the demo seed (unset = seed) | No | unset | Set on the migration job by `deploy.sh` (`true` with `--demo`, else `false`) |
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

The migration job (local `migrate` service, and the Cloud Run job `s87d9c6b4-migrate`) runs
`npx prisma migrate deploy && npm run prisma:seed` from the same image. In the cloud the seed only
creates demo accounts when `deploy.sh --demo` set `SEED_DEMO_DATA=true`; otherwise it logs a skip.
Because the seed is also non-destructive, it is safe on every release; keep migrations additive.

| CI / deploy checks | Command |
|---|---|
| Deploy scripts (offline, fake gcloud) | `bash deploy/tests/test_deploy_stub.sh`, `bash deploy/tests/test_release_stub.sh` |
| Smoke test unit tests | `python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'` |
| Smoke test against a URL | `python3 deploy/smoke_test.py <URL>` (optional `SMOKE_EMAIL` + `SMOKE_PASSWORD`) |

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

## 5. GCP resources (course shared project)

The course replaced the per-team Free Trial with a shared project. The portal
(https://cpe334-student-cloud-4d7hbszvwq-as.a.run.app, "Lab 5 · Repository review") creates the
infrastructure, IAM, Workload Identity Federation and the GitHub `demo` environment variables; the
team only builds and deploys. We never create, delete or change IAM on these resources, never run the
kit's `teardown.sh`, and ask a TA to pause or clean up.

| Item | Value |
|---|---|
| Project / region | `cpe-se-course-2026` / `asia-southeast1` |
| Team prefix | `s87d9c6b4` |
| Cloud Run service | `s87d9c6b4` (port 8080, min 0 / max 1 instances, 512Mi) |
| Migration job | `s87d9c6b4-migrate` (`prisma migrate deploy` [+ seed]) |
| Artifact Registry image | `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s87d9c6b4/s87d9c6b4:<full commit SHA>` |
| Cloud SQL (PostgreSQL) | `s87d9c6b4-pg` |
| Runtime service account | `s87d9c6b4-runner@cpe-se-course-2026.iam.gserviceaccount.com` |
| Secrets | `s87d9c6b4-database-url`, `s87d9c6b4-demo-password`, `s87d9c6b4-admin-password` (unused by CPMS), `s87d9c6b4-app-secret-1` (= `JWT_SECRET`) |
| GitHub environment | `demo` with variables `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` (set by the portal when the repo is connected) |

Deploy files: `deploy/deploy.sh`, `deploy/release.sh` and `.github/workflows/deploy.yml` come from the
portal's kit for our prefix (infrastructure steps removed by the portal) and are kept in the kit's
structure. `deploy.sh` differs from the portal file in three CHANGE ME lines only: `--port 8080`,
`JWT_SECRET=s87d9c6b4-app-secret-1:latest` added to the service secrets, and `COOKIE_SECURE=true`
added to the service env. The migration/seed command is the kit's; CPMS adapts in the app instead
(`prisma/seed.ts` honours `SEED_DEMO_DATA=false`). The job also mounts the kit's
`s87d9c6b4-admin-password` secret as `ADMIN_PASSWORD`; CPMS does not read it, and the script's final
summary still prints the kit's TokTickIT admin e-mail line, which does not apply to CPMS.
`smoke_test.py` is rewritten for CPMS (no `/api/categories`, cookie session instead of a token).
`teardown.sh` and the kit's `test_deploy_stub.sh` (which tested infrastructure creation) are not used;
`deploy/tests/test_deploy_stub.sh` tests the current script.

## 6. Release procedure and finding the running commit

**One-time setup (after the deploy files are on `main`):**
1. Portal → Lab 5 · Repository review → *Recheck the latest main* → *Create resources and connect this
   repository* (wait for "resources ready", 10+ minutes; do not press it twice).
2. Cloud Shell: put a value in the JWT slot without printing it:
   `openssl rand -hex 48 | gcloud secrets versions add s87d9c6b4-app-secret-1 --data-file=- --project cpe-se-course-2026`
3. Cloud Shell: `git clone https://github.com/FramePongrit/Course-Project-Management-System.git && cd Course-Project-Management-System`
   (on `main`), then `DRY_RUN=1 bash deploy/deploy.sh --demo`, read the output, then
   `DRY_RUN=0 bash deploy/deploy.sh --demo`. The script refuses any branch other than `main`.

**Every release:** feature/fix branch → PR into `sprint-NN` (teammate review, CI `test-and-docker`
green) → release PR `sprint-NN` → `main` (review + CI) → merge. The merge triggers
`.github/workflows/deploy.yml`: CI again → build and push the image tagged with the commit SHA →
`deploy/release.sh` (resolve digest → migration job → service update) → smoke test → run summary.

**Which commit is running:** the deploy run summary lists the commit image tag and digest; or
`gcloud run services describe s87d9c6b4 --region asia-southeast1 --project cpe-se-course-2026 --format='value(spec.template.spec.containers[0].image)'`
shows the `@sha256` digest, and `gcloud artifacts docker images describe <digest>` lists its tag (the
commit SHA).

**Rollback:** Actions → *Deploy demo* → Run workflow on `main` with `image_tag` = the full 40-character
SHA of an earlier release. Tests, build and migration are skipped; the service is pointed at that image
and smoke-tested. The schema is not rolled back, so migrations stay additive.
