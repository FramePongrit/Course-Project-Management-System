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
Default configuration values:
- `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cpms?schema=public"`
- `JWT_SECRET="cpms-super-secret-development-key-change-in-production"`
- `JWT_EXPIRES_IN="8h"`
- `COOKIE_SECURE="false"`
- `UNIVERSITY_EMAIL_DOMAIN="student.university.ac.th"`
- `PORT=8080`

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Migration & Seed
Run Prisma migrations and populate seed data:
```bash
npx prisma migrate dev
npm run prisma:seed
```

#### Demo Seeded Accounts (Local Handoff)
All seeded demo accounts use the standard demo password `password123`:

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
Run unit and integration test suites:
```bash
npm test
```

## Release

Sprint 1 target: `v1.0.0-sprint1` on `main`. Docker/CI-CD/GCP deployment is established in Lab 5.
