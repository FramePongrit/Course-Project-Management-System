# F-08 — Project Progress View
**Sprint 1** · Realizes FR-21, FR-10 · Depends on: F-07

## 1. Feature SDS

### Behavior & workflow
A per-Project view listing the Project's Milestones with each one's derived status (F-07). No numeric
percentage, weight or score (EX-05). A Student sees **their own** Project; a Supervisor sees a Project
**they are assigned** to. This is the Sprint-1 realization of "view own/assigned" (FR-10); the cross-project
board and filters are Sprint 3 (F-16).

### Business rules / validation
- Ownership via F-02: Student → own Project only; Supervisor → assigned Projects only; others → 404.
- Status is derived, not stored (F-07/BR-16).

### Permissions
- `GET /api/projects` returns only the caller's own (student) or assigned (supervisor) Projects.
- `GET /api/projects/:id/progress` requires own/assigned; else 404.

## 2. UI / API / data spec

### API
| Method | Path | Success | Errors |
|--------|------|---------|--------|
| GET | `/api/projects` | `200 { projects: [{ id, name, teamName }] }` — role-scoped | 401 |
| GET | `/api/projects/:id` | `200 { project }` | 401; 404 (not own/assigned) |
| GET | `/api/projects/:id/progress` | `200 { project, milestones: [{ id, name, deadline, status }] }` | 401; 404 |

### UI
- Student dashboard: the Student's one Project with its Milestones and status badges (Open / Submitted / Awaiting Feedback / Completed / Missed), deadlines in ICT. Empty state if none.
- Supervisor Projects list → Project detail showing the same progress, with the create-milestone control (F-04).
- Loading / empty / error states per SDS §3.2.

### Data
Reads only; no migration.

## 3. Acceptance Criteria

| AC | Given / When | Then |
|----|--------------|------|
| **AC-08-01** | a Student views their Project progress | 200; their Milestones with correct derived status; deadlines in ICT |
| **AC-08-02** | the assigned Supervisor views a Project's progress | 200; same Milestones/status |
| **AC-08-03** | any progress response is inspected | contains no numeric percentage/score (EX-05) |
| **AC-08-04** | a Student requests another Team's Project progress, or a Supervisor an unassigned one | 404; no data leaked |

## 4. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected |
|------|----|-------|----------------------|--------|----------|
| TEST-08-01 | AC-08-01 | API | student session; seeded milestones (varied states incl. past-deadline) | GET /projects/:id/progress | 200; statuses correct; ICT deadlines |
| TEST-08-02 | AC-08-02 | API | assigned supervisor session | GET progress | 200; matches |
| TEST-08-03 | AC-08-03 | API | any progress response | assert schema | no percentage/score field |
| TEST-08-04 | AC-08-04 | API | student A / unassigned supervisor | GET other project's progress | 404 |

## 5. Definition of Done
Product DoD + : progress scoped correctly for both roles; derived status matches F-07 across a mix of seeded
states (including the past-deadline Missed/Awaiting cases); no percentage/score; cross-scope access returns
404 (reuse F-02 ownership tests). This view is the primary surface for the end-to-end demo journey.

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial contract. |
