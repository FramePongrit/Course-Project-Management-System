# F-04 — Milestone Creation
**Sprint 1** · Realizes FR-11, FR-12, BR-03, BR-04, BR-08 (S1 part), BR-19 · Depends on: F-01, F-02, F-03

## 1. Feature SDS

### Behavior & workflow
An assigned Supervisor creates a Milestone (name, description, deadline) for one of their supervised
Projects. The Milestone is **immutable in Sprint 1** (no edit/delete endpoint; edit/delete arrives in F-15,
Sprint 3). Team members and the assigned Supervisor can list a Project's Milestones.

### Business rules / validation
- **BR-03** deadline must be **strictly in the future** at creation (compared against the server clock in ICT). Past/now → 422.
- **BR-04** `name` unique within the Project → duplicate 409 (service check + DB unique `(projectId,name)`).
- **BR-19** deadline parsed/stored as an instant (UTC) and evaluated in ICT.
- **BR-08** no mutation endpoint exists in Sprint 1.
- Validation: `name` non-empty (≤ 200 chars), `description` ≤ 2000 chars, `deadline` a valid ISO datetime.

### Permissions (via F-02)
- Create: SUPERVISOR assigned to the Project. Student → 403; unassigned Supervisor → 404; anonymous → 401.
- List: Student of the owning Team or the assigned Supervisor; others → 404.

## 2. UI / API / data spec

### API
| Method | Path | Body | Success | Errors |
|--------|------|------|---------|--------|
| POST | `/api/projects/:id/milestones` | `{ name, description, deadline }` | `201 { milestone }` | 401; 403 (student); 404 (unassigned/unknown project); 422 VALIDATION (bad body / past deadline, BR-03); 409 CONFLICT (duplicate name, BR-04) |
| GET | `/api/projects/:id/milestones` | — | `200 { milestones: [...] }` (each with derived status, F-07) | 401; 404 (not own/assigned) |
| GET | `/api/milestones/:id` | — | `200 { milestone }` | 401; 404 |

### UI
- Supervisor Project detail: "Create Milestone" form (name, description, deadline picker shown in ICT); inline 422/409 errors; list of existing Milestones with status.
- Student dashboard lists Milestones read-only (no create control).

### Data
`Milestone` (M1). Unique `(projectId, name)`. No further migration.

## 3. Acceptance Criteria

| AC | Given / When | Then |
|----|--------------|------|
| **AC-04-01** | assigned Supervisor posts a valid Milestone (future deadline, unique name) | 201; persisted and retrievable via GET |
| **AC-04-02** | deadline is in the past or now (BR-03) | 422; nothing persisted |
| **AC-04-03** | a Milestone name already used in that Project (BR-04) | 409; no second row |
| **AC-04-04** | a Student attempts to create a Milestone | 403 |
| **AC-04-05** | a Supervisor creates for a non-assigned Project | 404 |
| **AC-04-06** | no Sprint-1 endpoint mutates/deletes a Milestone (BR-08) | PUT/PATCH/DELETE on a milestone → 404/405 (route absent) |

## 4. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected |
|------|----|-------|----------------------|--------|----------|
| TEST-04-01 | AC-04-01 | API/DB | assigned supervisor session; seeded project | POST valid milestone; then GET | 201; GET returns it |
| TEST-04-02 | AC-04-02 | API+Unit | injectable clock = T | POST milestone deadline ≤ T | 422; service unit test on the future-deadline rule |
| TEST-04-03 | AC-04-03 | API/DB | milestone "M1" exists in project | POST another "M1" | 409; single row remains |
| TEST-04-04 | AC-04-04 | API | student session | POST milestone | 403 |
| TEST-04-05 | AC-04-05 | API | supervisor not assigned | POST milestone to that project | 404 |
| TEST-04-06 | AC-04-06 | API | any session | PATCH/DELETE milestone | route absent (404/405) |

## 5. Definition of Done
Product DoD + : future-deadline rule has a unit test with a fixed clock (BR-03/BR-19); duplicate-name
rejection proven at both service and DB layers (BR-04); immutability confirmed by absent mutation routes;
forbidden role/ownership covered (reuse F-02 cases). TDD red→green for BR-03 and BR-04.

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial contract. Milestone edit/delete deferred to Sprint 3 (F-15, D-08). |
