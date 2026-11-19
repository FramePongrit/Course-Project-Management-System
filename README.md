# Course-Project-Management-System (CPMS)

CPE 334 group project — **Theme 6: Course Project Management System**. A course-supervision product where
student **Teams** submit milestone work and receive **Supervisor** feedback, built over three sprints.

**Stack:** React (Vite, TS) · Node/Express (TS) · PostgreSQL via Prisma · JWT-in-httpOnly-cookie auth.

## Engineering documents

| Document | Purpose |
|----------|---------|
| [CONTEXT.md](CONTEXT.md) | Ubiquitous-language glossary (normative) |
| [docs/srs.md](docs/srs.md) | SRS — actors, scope/exclusions, FR/BR/NFR, assumptions, decisions |
| [docs/features.md](docs/features.md) | Feature inventory (F-01…F-17) with sprint allocation |
| [docs/traceability.md](docs/traceability.md) | Requirement → feature → sprint → AC/test matrix |
| [docs/system-sds.md](docs/system-sds.md) | System-level design: architecture, data model, API, role matrix, auth, deployment |
| [docs/sprints/plan.md](docs/sprints/plan.md) | Three-sprint plan |
| [docs/sprints/sprint-1/](docs/sprints/sprint-1/) | Sprint 1 feature contracts (SDS + AC + STS + DoD) |
| [docs/adr/](docs/adr/) | Architecture Decision Records (0001–0004) |

## Setup, build, test

### 1. Prerequisites
- **Node.js** >= 20.x
- **PostgreSQL** running locally on port 5432 (or configured via `DATABASE_URL`)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Every variable is documented in [.env.example](.env.example) (placeholders only) and in the
variable table of [docs/labs/lab-05/deployment.md](docs/labs/lab-05/deployment.md). Set at least
`DATABASE_URL` and `DEMO_USER_PASSWORD` (choose any local value). Never commit `.env`.

### 3. Install Dependencies
```bash
npm install
npx prisma generate
```

### 4. Database Migration & Seed
Run Prisma migrations and populate seed data:
```bash
npx prisma migrate dev
npm run prisma:seed
```

The seed is **safe by default**: if the database already has users it does nothing, so it can run on
every deploy without erasing data. To wipe and reseed a **local** database, run it with
`SEED_RESET=true` (never in the cloud).

#### Demo Seeded Accounts (Local Handoff)
All seeded demo accounts use the password in your `DEMO_USER_PASSWORD` environment variable. The
password is never stored in the code; share the cloud value with testers privately.

| Role | Name | Email | Associated Team / Project |
|------|------|-------|---------------------------|
| **Supervisor** | Prof. Somchai | `prof.somchai@university.ac.th` | Team Alpha (Course Project Management System) |
| **Supervisor** | Dr. Ann | `dr.ann@university.ac.th` | Team Beta (Smart Campus Transit) |
| **Student** | Alice Wong (STU001) | `alice@student.university.ac.th` | Team Alpha |
| **Student** | Bob Smith (STU002) | `bob@student.university.ac.th` | Team Alpha |
| **Student** | Charlie Brown (STU003) | `charlie@student.university.ac.th` | Team Beta |
| **Student (Invited)** | Dave Miller (STU004) | `dave@student.university.ac.th` | Unactivated (no password, for BR-15) |

### 5. Running the Application
To run both backend and frontend concurrently in development mode:
```bash
npm run dev
```
- Frontend UI: `http://localhost:3000` (or `http://localhost:8080` in production)
- Backend REST API: `http://localhost:8080/api`

To build and start production server:
```bash
npm run build
npm run start
```

### 6. Running Automated Tests
Run unit and API integration test suites (Vitest + Supertest):
```bash
npm test
```

Run UI / End-to-End test journeys (Playwright):
```bash
npm run test:e2e
```

## Release

Sprint 1 target: `v1.0.0-sprint1` on `main`. Docker/CI-CD/GCP deployment is established in Lab 5.
