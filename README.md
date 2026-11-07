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

> To be added with the Sprint 1 code scaffold. Will cover: dependencies, `.env.example`
> (`DATABASE_URL`, `JWT_SECRET`, `UNIVERSITY_EMAIL_DOMAIN`, …), database migration + seed, and the
> run/build/test commands. Synthetic demo data only; demo passwords are provided via a private handoff,
> never committed.

## Release

Sprint 1 target: `v1.0.0-sprint1` on `main`. Docker/CI-CD/GCP deployment is established in Lab 5.
