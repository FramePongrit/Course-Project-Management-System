# F-02 — Authorization & Ownership (cross-cutting)
**Sprint 1** · Realizes BR-17, NFR-01, NFR-02 · Depends on: F-01
Design basis: [`system-sds.md`](../../system-sds.md) §5–§6

## 1. Feature SDS

### Behavior & workflow
A reusable authorization layer every protected endpoint uses. Two concerns:

1. **Authentication guard** — reject requests without a valid session (401).
2. **Authorization guard** — from the **server-derived** identity (`req.user`, loaded from DB), check:
   - **Role:** the operation's required role (e.g. only SUPERVISOR may create a Milestone or Feedback; only a STUDENT may submit).
   - **Ownership:** the target record belongs to the caller's scope — a Student's own Team, or a Supervisor's assigned Team.

Authorization is **never** derived from a client-supplied user id, role, or team; only from the session.
A hidden UI control is not protection (BR-17).

### Error convention
- No session → `401 UNAUTHENTICATED`.
- Authenticated but wrong role for a write → `403 FORBIDDEN`.
- Authenticated but the resource is outside the caller's scope → `404 NOT_FOUND` (do not confirm existence of other teams' data; avoids disclosure, NFR-01).

### Dependencies / usage
Applied by F-04, F-05, F-06, F-08 (and all Sprint 2+ protected endpoints). This contract owns the shared
negative tests; feature contracts reference them rather than duplicating.

## 2. API / implementation spec
- Express middleware `requireAuth` (401 if no valid session) and `requireRole(role)` (403 if mismatch).
- Service-level ownership checks: `assertStudentOwnsTeam(user, teamId)`, `assertSupervisorAssigned(user, teamId|projectId|milestoneId)` → throw a typed `ForbiddenError`/`NotFoundError` mapped to the error shape.
- Ownership is resolved by joining through Membership (student) or `Team.supervisorId` (supervisor).

## 3. Acceptance Criteria

| AC | Given / When | Then |
|----|--------------|------|
| **AC-02-01** | no session → any protected endpoint (e.g. `GET /projects`, `POST …/milestones`) | 401, no domain data in the body (NFR-01) |
| **AC-02-02** | Student A requests Student B's team Project/Milestone/Submission | 404, B's data not returned |
| **AC-02-03** | a Student attempts a Supervisor write (create Milestone, record Feedback) | 403 |
| **AC-02-04** | a Supervisor requests a Team they are not assigned to | 404 |
| **AC-02-05** | a Supervisor attempts a Student write (create/overwrite a Submission) | 403 |
| **AC-02-06** | a request supplies a forged `userId`/`role`/`teamId` in body or query while logged in as another identity | the forged values are ignored; authorization uses the session identity only |

## 4. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected |
|------|----|-------|----------------------|--------|----------|
| TEST-02-01 | AC-02-01 | API | no cookie | call each protected route group | 401, empty of domain data |
| TEST-02-02 | AC-02-02 | API | Student A session; B's milestone/submission ids | GET those resources | 404 |
| TEST-02-03 | AC-02-03 | API | Student session | POST milestone; POST feedback | 403 |
| TEST-02-04 | AC-02-04 | API | Supervisor session; unassigned team's project | GET project / its milestones | 404 |
| TEST-02-05 | AC-02-05 | API | Supervisor session | PUT submission | 403 |
| TEST-02-06 | AC-02-06 | API | Student A session | PUT submission with body `teamId` = B's team | server ignores body team; acts on A's scope only (or 404/403), never writes to B |

## 5. Definition of Done
Product DoD + : every Sprint-1 write endpoint has a passing forbidden-role and forbidden-ownership test;
unauthenticated 401 covered for each route group; a test proves client-supplied identity fields are ignored
(BR-17). This contract's tests are referenced from F-04/F-05/F-06/F-08 rather than duplicated.

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial contract. |
