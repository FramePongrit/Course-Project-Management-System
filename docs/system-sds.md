# System-Level Software Design Specification (SDS)
**Product:** Course Project Management System (CPMS) · Baseline for Deliverable 1

This document defines the whole-product architecture, data model, UI/API conventions, role/permission
matrix, authentication, and configuration/deployment plan. Per-feature detail is in the Sprint contracts.

---

## 1. Architecture and stack

A **modular monolith**: one backend process serving a REST API and one single-page frontend, backed by one
relational database. Three logical layers, not three servers.

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **UI** | React (Vite) + TypeScript, React Router | Screens, forms, client-side validation for UX only, calls the API with the session cookie. Renders by role from `GET /api/me`. **Never the source of authorization.** |
| **API / application** | Node.js + Express + TypeScript | HTTP routing, request validation (zod), authentication middleware, **authorization guards**, domain services that enforce every Business Rule, error mapping. |
| **Domain services** | TypeScript modules inside the API process | All BR enforcement (cutoff, status derivation, ownership, immutability). Pure where possible, with time supplied by an **injectable clock** (NFR-09). |
| **Persistence** | PostgreSQL via Prisma ORM | Schema, constraints (unique/foreign-key), migrations, seed. The authoritative store; data survives restart (NFR-04). |

**Communication:** UI → API over HTTPS JSON. API → DB over the Prisma client. The browser holds only an
httpOnly session cookie (no domain data in local storage).

**Where business rules live:** in the domain services and reinforced by DB constraints. Examples: BR-02 and
BR-04 are both a service check **and** a DB unique index; BR-16 status is computed in a service and never
stored as user input; BR-01/BR-19 use the injectable clock in ICT.

```
Browser (React SPA)
   │  JSON over HTTPS, httpOnly session cookie
   ▼
Express API  ──auth middleware──▶ authorization guard ──▶ domain service ──▶ Prisma ──▶ PostgreSQL
                 (verify JWT,         (role + ownership       (BR enforcement,         (constraints,
                  load user from DB)   from server identity)   injectable clock)        migrations, seed)
```

## 2. Data model

Entities and the sprint that introduces them. All timestamps stored **UTC**; deadlines interpreted in ICT
for display and rule evaluation (BR-19).

### 2.1 Entities

**User** *(S1)* — a login identity with exactly one role.
`id` · `email` (unique, BR-14) · `passwordHash` (nullable; null ⇒ not activated, BR-15) · `name` ·
`role` (`STUDENT` | `SUPERVISOR`) · `status` (`ACTIVE` | `INVITED`) · `studentId` (unique, nullable; students only) · `createdAt`.

**Team** *(S1 seeded; created in S2)* — a named group owning one Project, with one Supervisor.
`id` · `name` (unique within offering, BR-13) · `supervisorId` → User(SUPERVISOR) · `createdAt`.

**Membership** *(S1 seeded; created in S2)* — a Student belongs to exactly one Team.
`id` · `userId` → User(STUDENT) (**unique**: one Team per Student) · `teamId` → Team · `createdAt`.

**Project** *(S1 seeded; created in S2)* — the work owned by one Team.
`id` · `name` · `description` · `teamId` → Team (**unique**: one Project per Team) · `createdAt`.

**Milestone** *(S1)* — deadline-bound expected work for one Project.
`id` · `projectId` → Project · `name` · `description` · `deadline` (timestamptz) ·
`createdById` → User(SUPERVISOR) · `createdAt`. **Unique `(projectId, name)`** (BR-04).

**Submission** *(S1)* — the current submission for one Team/Milestone.
`id` · `milestoneId` → Milestone · `teamId` → Team · `title` · `description` · `link` ·
`firstSubmittedById` → User · `firstSubmittedAt` · `lastUpdatedById` → User · `lastUpdatedAt`.
**Unique `(milestoneId, teamId)`** (BR-02, NFR-10).

**Feedback** *(S1)* — one immutable supervisor response per Team/Milestone.
`id` · `milestoneId` → Milestone · `teamId` → Team · `submissionId` → Submission (BR-18) · `text` ·
`recordedById` → User(SUPERVISOR) · `recordedAt`. **Unique `(milestoneId, teamId)`** (BR-06).

**Invitation** *(S2)* — single-use activation request.
`id` · `email` · `teamId` → Team · `tokenHash` (unique) · `status` (`PENDING`|`ACCEPTED`|`REVOKED`|`EXPIRED`) ·
`expiresAt` · `createdById` → User(SUPERVISOR) · `createdAt` · `acceptedAt` (nullable).

**SubmissionRevision** *(S2 — see migration M2)* — immutable numbered snapshot per submit.
`id` · `submissionId` → Submission · `revisionNumber` · `title` · `description` · `link` ·
`authoredById` → User · `authoredAt`. **Unique `(submissionId, revisionNumber)`**; newest = current.

### 2.2 Relationships (text ER)

```
User(SUPERVISOR) 1───* Team 1───1 Project 1───* Milestone 1───* Submission 1───0..1 Feedback
                        │                                            │
User(STUDENT) *──1 Membership *───┘ (Team)             Submission 1───* SubmissionRevision (S2)
Team 1───* Invitation (S2)
```

- One Supervisor supervises many Teams; each Team has exactly one Supervisor and one Project.
- One Student has one Membership → one Team. One Team has many Students.
- One Project has many Milestones. One Milestone has at most one Submission **per Team** (here one owning Team) and at most one Feedback per Team.

### 2.3 Constraints enforced in the database

- `User.email` unique; `User.studentId` unique; (BR-14)
- `Team.name` unique; (BR-13)
- `Membership.userId` unique; (one Team per Student)
- `Project.teamId` unique; (one Project per Team)
- `Milestone (projectId, name)` unique; (BR-04)
- `Submission (milestoneId, teamId)` unique; (BR-02)
- `Feedback (milestoneId, teamId)` unique; (BR-06)
- All FKs `ON DELETE RESTRICT` (nothing in the domain is hard-deleted in Sprint 1; BR-07).

### 2.4 Database setup, migrations, seed

- **Migrations:** Prisma migrations, committed. Sprint-1 migration **M1** creates User, Team, Membership, Project, Milestone, Submission, Feedback with the constraints above.
- **M2 (Sprint 2, documented now):** add `Invitation`; add `SubmissionRevision` and a `Submission.currentRevisionId` pointer; **backfill one revision per existing Submission**. This is additive — no Sprint-1 table is restructured, so Sprint 1's single-record Submission model upgrades to revisions without rework.
- **Seed (F-03):** one Course offering context; ≥2 Supervisors; several Students; Teams with one Supervisor each; Memberships; one Project per Team; and per Project several Milestones including **two past-deadline Milestones** (A-06) — one with no Submission (→ Missed) and one with a Submission timestamped before its deadline (→ Awaiting Feedback) — plus future-deadline Milestones (→ Open/Submitted/Completed paths). Demo passwords are bcrypt-hashed in seed; their plaintext lives only in the private handoff. Seed is idempotent and reproducible.
- **Injectable clock:** the app is built by a `createApp({ clock })` factory; production passes the real clock, tests pass a fixed/controllable clock so BR-01 (cutoff) and BR-16 (status) are testable at the API level (NFR-09).

## 3. UI structure and conventions

### 3.1 Screens / navigation

| Screen | Who | Purpose |
|--------|-----|---------|
| Login | anonymous | email + password → session; redirect by role |
| Student · Project dashboard | Student | the Student's one Project, its Milestones with status (F-08) |
| Student · Milestone detail | Student | Submission form (create/overwrite before cutoff), current Submission, Feedback (read) |
| Supervisor · Projects list | Supervisor | assigned Projects (F-10) |
| Supervisor · Project detail | Supervisor | Milestones + "Create Milestone" (F-04); each Milestone's status |
| Supervisor · Milestone detail | Supervisor | read-only Submission, "Record Feedback" (F-06) |
| *(S2)* Supervisor · Invitations | Supervisor | create/revoke invitations; **copyable activation links** (audit log) |
| *(S2)* Activate account | invited | set password via token |
| *(S3)* Supervisor · Progress board | Supervisor | cross-project filtered board (F-16); summary (F-17) |

### 3.2 Shared UI behavior

- **Validation:** inline, client-side for UX only; the server re-validates and is authoritative (NFR-08).
- **Loading / empty / error states:** every data view shows a loading state, an explicit empty state (e.g. "No milestones yet"), and a readable error state mapped from the API error shape.
- **Role rendering:** the SPA renders controls by role from `GET /api/me`, but hiding a control is **never** the protection — the backend rejects the operation regardless (BR-17).
- **Time display:** deadlines shown in ICT with an explicit "(ICT)" label.

## 4. API conventions

- Base path `/api`. JSON request/response. Auth via the httpOnly session cookie.
- **Methods/paths (Sprint 1):**
  - `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/me`
  - `GET /api/projects` (role-scoped) · `GET /api/projects/:id` · `GET /api/projects/:id/progress`
  - `POST /api/projects/:id/milestones` · `GET /api/projects/:id/milestones` · `GET /api/milestones/:id`
  - `PUT /api/milestones/:id/submission` (create/overwrite, idempotent upsert) · `GET /api/milestones/:id/submission`
  - `POST /api/milestones/:id/feedback` · `GET /api/milestones/:id/feedback`
  - *(S2+)* `POST/DELETE /api/invitations`, `POST /api/activate`, `POST /api/teams`, `POST /api/projects`, `DELETE /api/memberships/:id`, `GET /api/milestones/:id/revisions`
- **Success shapes:** `200`/`201` with the resource JSON. `PUT submission` returns the current Submission.
- **Error shape (uniform):** `{ "error": { "code": "<MACHINE_CODE>", "message": "<human text>" } }` with codes such as `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION` (422), `CONFLICT` (409), `CUTOFF_PASSED` (422), `NO_SUBMISSION` (422), `FEEDBACK_RECORDED` (409). Errors never leak another team's data (NFR-01).
- **Ownership on reads:** a request for a resource the caller may not access returns `404` (not "exists but forbidden") where leaking existence would itself be disclosure; role violations on writes return `403`. (Chosen convention; applied consistently.)

## 5. Role / permission matrix

Access is enforced on the backend from the server session identity (BR-17). "own" = the caller's Team;
"assigned" = a Team the Supervisor supervises.

| Operation | Anonymous | Student (own) | Student (other team) | Supervisor (assigned) | Supervisor (other) |
|-----------|:--:|:--:|:--:|:--:|:--:|
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /me` | ❌401 | ✅ | ✅ | ✅ | ✅ |
| View own/assigned Project & Milestones | ❌401 | ✅ | ❌404 | ✅ | ❌404 |
| Create Milestone | ❌401 | ❌403 | ❌403 | ✅ | ❌404 |
| Create/overwrite Submission | ❌401 | ✅ | ❌404 | ❌403 | ❌403 |
| View Submission | ❌401 | ✅ | ❌404 | ✅ (read-only) | ❌404 |
| Record Feedback | ❌401 | ❌403 | ❌403 | ✅ | ❌404 |
| View Feedback | ❌401 | ✅ | ❌404 | ✅ | ❌404 |
| *(S2)* Create/revoke Invitation, create Team/Project, remove Membership | ❌401 | ❌403 | ❌403 | ✅ (assigned) | ❌403/404 |

## 6. Authentication and session (see [ADR-0004](adr/0004-authentication-and-session.md))

- **Credential:** email + password; bcrypt hash (cost ≥ 10, NFR-03). `INVITED`/null-hash accounts cannot log in (BR-15).
- **Session token:** on login, a JWT (HS256, signed with `JWT_SECRET`; claims `sub`=userId, `role`, `exp`≈8h) is set in a cookie `httpOnly; SameSite=Lax; Secure (prod); Path=/`.
- **Per-request:** auth middleware verifies the JWT, then **loads the User from the DB by `sub`** and attaches the fresh role, status and membership — authorization is from this server identity, not client input (BR-17). Non-ACTIVE users are rejected.
- **current-user:** `GET /api/me` returns `{ id, name, email, role, teamId?, projectId? }`.
- **Logout:** `POST /api/auth/logout` clears the cookie. The stateless token remains valid until expiry (no denylist in Sprint 1) — a documented, accepted limitation mitigated by the short lifetime.
- **Onboarding (S2):** no public registration; entry is invitation activation only. SSO is the future path, isolated to the credential-check step.

## 7. Configuration and delivery design

### 7.1 Environment variables (no real secrets in Git)

| Variable | Purpose | Example (non-secret) |
|----------|---------|----------------------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@db:5432/cpms` |
| `JWT_SECRET` | sign/verify session JWT | *(provided at deploy; never committed)* |
| `JWT_EXPIRES_IN` | token lifetime | `8h` |
| `COOKIE_SECURE` | Secure flag on session cookie | `true` in prod, `false` local |
| `UNIVERSITY_EMAIL_DOMAIN` | allowed invitation domain (BR-10) | `student.university.ac.th` |
| `PORT` | API port | `8080` |

Secrets are provided through the environment / a secret manager, documented by name only. `.env.example`
lists names with safe placeholders; real `.env` is gitignored.

### 7.2 Deployment plan (designed now, built in Lab 5)

- **Packaging:** Docker — one image for the API (serving the built SPA as static assets, or a second small static image), PostgreSQL as a managed/containerized DB with a durable volume. Three logical layers do not require three containers.
- **GCP target:** containerized API on Cloud Run (stateless — the JWT-cookie session needs no session store, which is why it suits horizontal scaling), PostgreSQL on Cloud SQL with persistent storage so data survives restart/redeploy (NFR-04).
- **CI/CD (Lab 5):** PR runs build + automated tests as a required check; a failed required check blocks the normal merge/release path; accepted releases deploy from `main` through a repeatable pipeline with a documented manual approval.
- **Config at deploy:** environment variables / secret manager; migrations run as a release step; seed runs for demo environments only.

## 8. Diagrams

The text ER (§2.2), the architecture flow (§1) and the status state machine (in
[`docs/sprints/sprint-1/F-07-milestone-status.md`](sprints/sprint-1/F-07-milestone-status.md)) are the
design diagrams for this baseline. No fixed UML quota is required; more diagrams will be added only where
they clarify a decision.

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial System-Level SDS. |
| 0.2 | 2026-11-07 | team | Added `NO_SUBMISSION`/`FEEDBACK_RECORDED` error codes; seed now has two past-deadline Milestones; documented the `createApp({ clock })` factory. |
