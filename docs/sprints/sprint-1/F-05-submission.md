# F-05 — Submission Create / Overwrite
**Sprint 1** · Realizes FR-15, FR-16, BR-01, BR-02, BR-07, NFR-08, NFR-10 · Depends on: F-04

## 1. Feature SDS

### Behavior & workflow
A Student of the owning Team creates the Team's Submission for a Milestone, or overwrites it before the
deadline. The endpoint is an **idempotent upsert**: the first call creates the single current record
(recording `firstSubmittedBy/At`); later calls before the cutoff update it (recording `lastUpdatedBy/At`).
There is exactly **one current Submission per (Milestone, Team)** and it **cannot be deleted**. Any team
member can overwrite; last write wins (no conflict detection). The current Submission is retrievable by team
members and read-only to the assigned Supervisor.

### Business rules / validation
- **BR-01** reject create/overwrite when `now ≥ milestone.deadline` (ICT) → 422 `CUTOFF_PASSED`.
- **BR-02** one current Submission per `(milestoneId, teamId)` — DB unique constraint + upsert. Two concurrent first-submits **both return 200 and leave exactly one row**. Implement with `INSERT … ON CONFLICT (milestone_id, team_id) DO UPDATE`, or catch Prisma error `P2002` and retry as an update. (Verify that Prisma's `upsert` actually compiles to a native upsert for this query before relying on it; otherwise use raw `ON CONFLICT`.)
- **BR-20** once **Feedback exists** for the Milestone/Team, the Submission is **frozen**: any overwrite is rejected with 409 `FEEDBACK_RECORDED`. The current Submission becomes immutable and the Milestone is Completed (final). (See D-09.)
- **BR-07** no delete endpoint.
- **NFR-08** `title` non-empty (≤ 200), `description` ≤ 2000, `link` a valid `http(s)` URL → else 422.
- **NFR-10** persist `firstSubmittedBy/At` (set once) and `lastUpdatedBy/At` (each write).
- **BR-05** if the Milestone is already Missed (past deadline, no submission) the first submit is rejected by BR-01 anyway (cutoff), i.e. a Missed Milestone cannot be submitted to.

### Permissions (via F-02)
- Create/overwrite: STUDENT who is a member of the owning Team. Supervisor → 403; other-team student → 404; anonymous → 401.
- View: team member or assigned Supervisor; others → 404.

## 2. UI / API / data spec

### API
| Method | Path | Body | Success | Errors |
|--------|------|------|---------|--------|
| PUT | `/api/milestones/:id/submission` | `{ title, description, link }` | `200 { submission }` (current record) | 401; 403 (supervisor); 404 (not member / unknown); 422 VALIDATION (bad field) or `CUTOFF_PASSED` (BR-01); 409 `FEEDBACK_RECORDED` (BR-20, overwrite after Feedback) |
| GET | `/api/milestones/:id/submission` | — | `200 { submission }` or `200 { submission: null }` if none | 401; 404 (not own/assigned) |

`PUT` (not POST) signals idempotent upsert of the single current record.

### UI
- Student Milestone detail: form (title, description, link) prefilled with the current Submission if any; submit; shows "last updated by X at …(ICT)"; disabled with an explanatory message once the deadline has passed; inline validation and cutoff error.
- Supervisor Milestone detail: the same Submission shown **read-only**.

### Data
`Submission` (M1): unique `(milestoneId, teamId)`; audit fields. No further migration in Sprint 1.
*(Sprint 2 M2 adds `SubmissionRevision`; the Sprint-1 single record becomes revision #1 — additive.)*

## 3. Acceptance Criteria

| AC | Given / When | Then |
|----|--------------|------|
| **AC-05-01** | team member submits valid data before the deadline, first time | 200; persisted; `firstSubmittedBy/At` set (NFR-10) |
| **AC-05-02** | a member overwrites before the deadline | 200; same single record updated; `lastUpdatedBy/At` changes; `firstSubmittedBy/At` unchanged |
| **AC-05-03** | submit/overwrite at or after the deadline (BR-01) | 422 `CUTOFF_PASSED`; no change persisted |
| **AC-05-04** | title empty, or link not `http(s)` (NFR-08) | 422; nothing persisted |
| **AC-05-05** | two concurrent first-submits for one (milestone, team) (BR-02) | both succeed (200); exactly one current row exists |
| **AC-05-06** | a student of another team submits | 404 |
| **AC-05-07** | a supervisor submits | 403 |
| **AC-05-08** | any delete attempt on a Submission (BR-07) | no route (404/405); record remains |
| **AC-05-09** | GET the Milestone's submission after saving | 200 returns the persisted current Submission |
| **AC-05-10** | a member overwrites the Submission **after Feedback has been recorded** (BR-20) | 409 `FEEDBACK_RECORDED`; the Submission is unchanged |

## 4. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected |
|------|----|-------|----------------------|--------|----------|
| TEST-05-01 | AC-05-01 | API/DB | member session; future-deadline milestone | PUT valid | 200; row created; first-audit set |
| TEST-05-02 | AC-05-02 | API/DB | existing submission | PUT again (diff member) | 200; one row; last-audit updated, first-audit stable |
| TEST-05-03 | AC-05-03 | API+Unit | injectable clock past deadline | PUT | 422 CUTOFF_PASSED; unit test on cutoff rule |
| TEST-05-04 | AC-05-04 | API | member session | PUT empty title / bad link | 422; no persistence |
| TEST-05-05 | AC-05-05 | API/DB | future-deadline milestone, no submission | fire two concurrent PUTs | both 200; exactly one row (unique constraint) |
| TEST-05-06 | AC-05-06 | API | other-team student | PUT | 404 |
| TEST-05-07 | AC-05-07 | API | supervisor | PUT | 403 |
| TEST-05-08 | AC-05-08 | API | existing submission | DELETE | route absent (404/405) |
| TEST-05-09 | AC-05-09 | API/DB | after TEST-05-01 | GET submission | 200 = saved data |
| TEST-05-10 | NFR-04 | API/DB | saved submission; restart app/reconnect | GET submission | 200 = unchanged (persistence) |
| TEST-05-11 | AC-05-10 | API/DB | submission + feedback exist | PUT overwrite | 409 `FEEDBACK_RECORDED`; row unchanged |

## 5. Definition of Done
Product DoD + : cutoff is a unit test with a fixed clock (BR-01); uniqueness proven with a concurrent-submit
test against the DB constraint, both calls 200 and one row (BR-02); the post-Feedback freeze proven (409,
BR-20); audit fields asserted (NFR-10); persistence reload test green (NFR-04); no delete path; forbidden
role/ownership covered. TDD red→green for BR-01, BR-02 and BR-20.

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial contract. |
| 0.2 | 2026-11-07 | team | Added BR-20 freeze-after-Feedback (AC-05-10/TEST-05-11); made the concurrency outcome deterministic (both 200, one row) and specified native upsert; removed `DUPLICATE_SUBMISSION`. |
