# CPMS Deployment (Lab 5)

Status: **complete for Lab 5** (Issues #7–#15). Live service, release procedure and the evidence for
C-01…C-06 are in §7. Values in §7 are a snapshot of 22 Nov 2026; §6 explains how to find the commit
that is running at any time.

- **Live URL:** https://s87d9c6b4-4d7hbszvwq-as.a.run.app (the same Cloud Run service `s87d9c6b4` also
  answers at https://s87d9c6b4-670075229477.asia-southeast1.run.app)
- **Repository:** https://github.com/FramePongrit/Course-Project-Management-System (public)
- **Release path:** feature/fix branch → PR into `sprint-NN` → release PR into `main` → *Deploy demo*

## 1. Stack and changes from the reference kit

| Item | CPMS | Starter kit (TokTickIT) | Why |
|---|---|---|---|
| Runtime | Node.js 22 (alpine) | Node.js 24 | Matches the project's `@types/node` 22 and README (>= 20). |
| Layout | One `package.json` at repo root (`src/` API, `client/` SPA) | `server/` and `client/` packages | Existing repo structure. |
| Image | One image serves API + built SPA | Same | — |
| Port | **8080** | 3000 | App default; Cloud Run default. `deploy.sh --port` is 8080. |
| Local compose | `db` + `migrate` + `app` (one image) | Separate client (nginx) and server images | The SPA is already served by Express; a second web image is not needed. |
| Entrypoint | Exec-form `CMD ["node","dist/index.js"]`, no shell script | `docker-entrypoint.sh` | Same PID-1 behaviour; avoids CRLF problems on Windows. |
| Auth sessions | Stateless JWT in an httpOnly, `Secure` cookie | Sessions in DB | Nothing session-related lives in the container. |
| Uploads | None (submissions store a link) | Files in DB | Nothing user-generated lives in the container. |
| GCP | Course shared project via the course portal (§5) | Own Free Trial project + `deploy.sh` creating everything | Course decision after the handout was published. |

**Staging branch:** the staging/integration branch of the current sprint is `sprint-NN` (Lab 5:
`sprint-01`; the next sprint uses `sprint-02`). CI runs on PRs into `main` and `sprint-*`.

## 2. Environment variables

All placeholders are in [`.env.example`](../../../.env.example). `.env` is git-ignored and never committed.

| Variable | Purpose | Secret? | Local value from | Cloud value from |
|---|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | **Yes** | `.env` (compose builds it from `POSTGRES_*`) | Secret Manager `s87d9c6b4-database-url` (made by the course portal) |
| `JWT_SECRET` | Signs session cookies. App refuses to start in production if empty or a known placeholder | **Yes** | `.env` (random value) | Secret Manager `s87d9c6b4-app-secret-1` (team slot 1, value added by us) |
| `JWT_EXPIRES_IN` | Session lifetime (default `8h`) | No | `.env` | Default (`8h`) |
| `COOKIE_SECURE` | `Secure` cookie flag: `false` on http://localhost, **`true` on Cloud Run** | No | `.env` | Cloud Run env var (`deploy.sh`) |
| `UNIVERSITY_EMAIL_DOMAIN` | Allowed student e-mail domain | No | `.env` | Default |
| `PORT` | Listen port (default 8080) | No | `.env` / compose | Injected by Cloud Run (`--port 8080`) |
| `NODE_ENV`, `TZ` | `production`, `Asia/Bangkok` | No | Dockerfile | Dockerfile / `deploy.sh` |
| `DEMO_USER_PASSWORD` | Password of all seeded demo accounts (Lab 6 UAT); also used by the tests | **Yes** (cloud) | `.env`; CI generates one per run | Secret Manager `s87d9c6b4-demo-password` (migration job only, with `--demo`) |
| `SEED_DEMO_DATA` | `false` skips the demo seed (unset = seed) | No | unset | Set on the migration job by `deploy.sh` (`true` with `--demo`, else `false`) |
| `SEED_RESET` | `true` wipes all tables before seeding | No | `.env` (local only) | **Never set** |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Local compose database | Password: yes | `.env` | Not used (Cloud SQL) |

GitHub Actions configuration (no secret values): environment `demo` variables `GCP_PROJECT_ID`,
`GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` (values from the portal's *Team resources* tab).
Optional for the smoke test: variable `SMOKE_EMAIL` + secret `SMOKE_PASSWORD` (set both or neither).

Demo account e-mails are listed in the README; their password is shared with the Lab 6 partner team
privately and never shown on screen, in screenshots, in the repository or in an agent chat. The former
"Demo Quick Login" buttons, which shipped the password in the client bundle, were removed (#16).

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

CI (`.github/workflows/ci-docker.yml`, job **`test-and-docker`**) runs all of the above on every PR into
`main` and `sprint-*`: deploy-script checks → install → typecheck → migrate + seed → Vitest → reseed →
Playwright → production `docker build`.

## 4. Local verification (C-03)

Fresh `git clone` of `main` @ `8e1a1c9` into an empty folder, `.env` from `.env.example` with only
`JWT_SECRET` filled, `docker compose up --build` (22 Nov 2026):

| Check | Result |
|---|---|
| Clone | clean working tree, no `.env` present |
| `diff .env.example .env` | only the `JWT_SECRET` line differs |
| `docker compose up --build` | db healthy → migrate (migrate deploy + seed) exit 0 → app ready in ~4 s |
| Container user | `node` (non-root) |
| `/api/health`, `/api/ready`, `/` | `{"status":"ok"}`, `{"status":"ready"}`, SPA served |
| Demo login (Alice) + project milestones | 200; 5 milestones |
| `deploy/smoke_test.py` with demo login | 6/6 PASS |
| Earlier pre-merge checks | restart and `down`/`up` keep data; image refuses to start in production without `JWT_SECRET`; image env only `NODE_ENV`, `TZ`, `PORT`; no `.env` or demo password in the image or the client bundle |

## 5. GCP resources (course shared project)

The course replaced the per-team Free Trial with a shared project managed by a course portal. When the
repository was connected ("Lab 5 · Repository review" → *Create resources and connect this
repository*), the portal created the infrastructure, IAM and Workload Identity Federation. The team
builds and deploys only. We never create, delete or change IAM on these resources. We never run the
kit's `teardown.sh`, and we ask a TA to pause or clean up.

| Item | Value |
|---|---|
| Project / region | `cpe-se-course-2026` / `asia-southeast1` |
| Team prefix | `s87d9c6b4` |
| Cloud Run service | `s87d9c6b4` (port 8080, min 0 / max 1 instances, 1 CPU, 512 MiB) |
| Migration job | `s87d9c6b4-migrate` (`prisma migrate deploy && prisma:seed`) |
| Artifact Registry image | `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s87d9c6b4/s87d9c6b4:<full commit SHA>` |
| Cloud SQL | `s87d9c6b4-pg` (PostgreSQL 16, Enterprise, `db-f1-micro`), database and user `s87d9c6b4` |
| Service accounts | runtime `s87d9c6b4-runner@…`, GitHub deployer `s87d9c6b4-deployer@…` |
| Workload Identity | pool `s87d9c6b4-pool`, provider `s87d9c6b4-provider` (bound to `.github/workflows/deploy.yml` on `main`, environment `demo`) |
| Secrets | `s87d9c6b4-database-url`, `s87d9c6b4-demo-password`, `s87d9c6b4-admin-password` (unused by CPMS), `s87d9c6b4-app-secret-1` (= `JWT_SECRET`); slots 2–5 unused |
| GitHub | environment `demo` (4 variables above, deployable from `main` only); ruleset `main-protection` (§6) |

Deploy files: `deploy/deploy.sh`, `deploy/release.sh` and `.github/workflows/deploy.yml` come from the
portal's kit for our prefix (the portal removed the infrastructure steps) and keep the kit's structure.

`deploy.sh` differs from the portal file in three CHANGE ME lines only:
- `--port 8080`
- `JWT_SECRET=s87d9c6b4-app-secret-1:latest` in the service secrets
- `COOKIE_SECURE=true` in the service env

The migration/seed command is the kit's; CPMS adapts in the app instead (`prisma/seed.ts` honours
`SEED_DEMO_DATA=false`). Two kit leftovers do not apply to CPMS:
- The job mounts the kit's `s87d9c6b4-admin-password` secret as `ADMIN_PASSWORD`; CPMS does not read it.
- The script's final summary prints the TokTickIT admin e-mail line.

The portal's repository review still reports "deploy.sh does not match the Starter Kit structure". It
compares against the original TokTickIT kit, and the repository already contains the portal's adapted
file, so no patch is needed.

`smoke_test.py` is rewritten for CPMS: no `/api/categories`, and a cookie session instead of a token.
`teardown.sh` and the kit's `test_deploy_stub.sh` (which tested infrastructure creation) are not used;
`deploy/tests/test_deploy_stub.sh` tests the current script.

## 6. Release procedure and finding the running commit

**One-time setup (done 22 Nov 2026):**
1. Portal → Lab 5 · Repository review → *Recheck the latest main* → *Create resources and connect this
   repository* (once; wait for "resources ready", 10+ minutes).
2. GitHub → Settings → Environments → `demo`: set the four variables from the portal's *Team resources*
   tab; deployment branches = `main` only.
3. Cloud Shell: put a value in the JWT slot without printing it:
   `openssl rand -hex 48 | tr -d '\n' | gcloud secrets versions add s87d9c6b4-app-secret-1 --data-file=- --project cpe-se-course-2026`
4. Cloud Shell, on a fresh clone of `main`: `DRY_RUN=1 bash deploy/deploy.sh --demo`, read the output,
   then `DRY_RUN=0 bash deploy/deploy.sh --demo`. The script refuses any branch other than `main`. It
   sets the job command, the secrets/env and the port that later releases reuse.
5. GitHub → Settings → Rules → ruleset **`main-protection`** on `main`: active, empty bypass list,
   require a PR with 1 approval, required status check **`test-and-docker`**, branches up to date,
   block force pushes and deletions.

**Every release:**
1. Issue → feature/fix branch from `sprint-NN` → PR into `sprint-NN`. The teammate reviews with
   *Review changes → Approve* and states what was checked; CI `test-and-docker` must be green.
2. Release PR `sprint-NN` → `main`. If GitHub says the branch is out of date, press *Update branch* and
   let CI run again. The ruleset requires CI and 1 approval.
3. Merging triggers **Deploy demo** (`.github/workflows/deploy.yml`):
   1. CI again (`test / test-and-docker`)
   2. Workload Identity sign-in (no key)
   3. Build and push the image tagged with the full commit SHA
   4. `deploy/release.sh`: resolve the digest → run the migration job → update the service
   5. `deploy/smoke_test.py`
   6. Run summary with the commit tag and digest

**Which commit is running:**
1. *Actions → Deploy demo* → the latest successful run on `main`: the summary shows the commit image tag,
   the digest and the URL.
2. GCP Console → Cloud Run → `s87d9c6b4` → *Revision History*: the revision serving 100% and its image
   `…/s87d9c6b4@sha256:<digest>`. Or in Cloud Shell:
   `gcloud run services describe s87d9c6b4 --region asia-southeast1 --project cpe-se-course-2026 --format='value(status.latestReadyRevisionName,spec.template.spec.containers[0].image)'`
3. Match the digest to the commit: run 2 shows the image index digest pushed for `<commit>`. Cloud Run
   shows the linux/amd64 manifest inside that index; it is listed as `exporting manifest sha256:…` in
   the run's *Build and push image* log.

**Restart without a code change:** Cloud Run → `s87d9c6b4` → *Redeploy* → *Deploy new revision* with no
changes. This creates a new revision with the same image and replaces all containers.

**Rollback:** Actions → *Deploy demo* → *Run workflow* on `main` with `image_tag` = the full 40-character
SHA of an earlier release. Tests, build and migration are skipped; the service is pointed at that image
and smoke-tested. Then roll forward the same way, or with the next release. The schema is not rolled
back, so migrations stay additive.

**Cost and operations:** Cloud Run scales to zero (min 0, max 1). Cloud SQL belongs to the course portal
and TAs. Keep the service running until the instructor announces the end of grading, and never
stop, restart or delete Cloud SQL ourselves.

## 7. Lab 5 verification (snapshot 22 Nov 2026)

| Check | What was shown | Evidence |
|---|---|---|
| **C-01** (R-05) | A normal PR runs build + all tests and passes | PR #19, run [44746674389](https://github.com/FramePongrit/Course-Project-Management-System/actions/runs/44746674389): Vitest 54 passed, Playwright 2 passed, Docker build |
| **C-02** (R-06) | A PR from a temporary branch with one failing test cannot be merged | PR #24 (`tmp/c02-failing-test`), run [44984792780](https://github.com/FramePongrit/Course-Project-Management-System/actions/runs/44984792780): 1 failed / 54 passed; ruleset blocked the merge; closed without merging |
| **C-03** (R-01, R-02) | Fresh clone builds and runs with only `.env.example` values | §4 (main @ `8e1a1c9`) |
| **C-04** (R-03) | Domain workflow on the public URL | Alice signs in and submits Sprint 3 (Open → Submitted); "Sprint 0 Proposal" refuses a submission after the deadline (BR-01/BR-05); Prof. Somchai records feedback (→ Completed, submission frozen BR-20) |
| **C-05** (R-04) | A record survives a restart and a redeploy | Sprint 3 submission (last saved 11:08 ICT) + feedback (11:15 ICT) unchanged after the pipeline redeploy (revision 00003) and after a restart (revision 00004, same image) |
| **C-06** (R-07–R-10) | Reviewed change from staging into main, deployed, running revision matches its commit | Issue #25 → PR #26 → release PR #27 → merge `2a6fdc08fa2fee41cca677efd8572d3fb51c162c` → Deploy demo run [44987165130](https://github.com/FramePongrit/Course-Project-Management-System/actions/runs/44987165130) → revision `s87d9c6b4-00003-w77` (image manifest `sha256:74a5f093591558ed…`); the live page shows the fix |

Revision history: `00001` portal placeholder → `00002` first deploy with `deploy.sh` (main @ `8e1a1c9`)
→ `00003-w77` Deploy demo (main @ `2a6fdc0`) → `00004-ccn` restart, same image. Later releases add
revisions; use §6 to read the current one.

All Lab 5 Issues and PRs carry the `lab5` label (Issues #7–#15, #25; PRs #16–#24, #26, #27).
