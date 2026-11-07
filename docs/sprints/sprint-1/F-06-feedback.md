# F-06 — Feedback Recording
**Sprint 1** · Realizes FR-18, FR-19, BR-05, BR-06, BR-18 · Depends on: F-05
Design basis: [ADR-0003](../../adr/0003-feedback-recordable-once-submission-exists.md)

## 1. Feature SDS

### Behavior & workflow
The assigned Supervisor records a single text Feedback for a Team's Milestone **once a Submission exists**,
whether or not the deadline has passed (D-03). Feedback is **immutable** — exactly one per (Team, Milestone),
not editable or deletable. It is associated with the **current Submission** at the time of recording
(BR-18). Feedback is visible to the owning Team's members and the assigned Supervisor only; it carries no
score.

### Business rules / validation
- **BR-05** a Missed Milestone (deadline passed, no Submission) has no Submission, so Feedback is rejected (422 `NO_SUBMISSION`).
- **BR-06** at most one Feedback per (milestoneId, teamId) — service check + DB unique; a second attempt → 409.
- **BR-18** store `submissionId` of the current Submission when recording.
- **BR-20** recording Feedback **freezes the Team's Submission** for that Milestone — a later overwrite is rejected with 409 `FEEDBACK_RECORDED` (enforced in F-05). This guarantees the Feedback always describes the exact Submission the Supervisor saw (D-09), so AC-06-08 holds permanently.
- Validation: `text` non-empty (≤ 4000 chars).

### Permissions (via F-02)
- Record: assigned SUPERVISOR. Student → 403; unassigned Supervisor → 404; anonymous → 401.
- View: owning Team members + assigned Supervisor; others → 404.

## 2. UI / API / data spec

### API
| Method | Path | Body | Success | Errors |
|--------|------|------|---------|--------|
| POST | `/api/milestones/:id/feedback` | `{ text }` | `201 { feedback }` | 401; 403 (student); 404 (unassigned/unknown); 422 VALIDATION (empty) or `NO_SUBMISSION` (BR-05); 409 CONFLICT (already exists, BR-06) |
| GET | `/api/milestones/:id/feedback` | — | `200 { feedback }` or `{ feedback: null }` | 401; 404 (not own/assigned) |

### UI
- Supervisor Milestone detail: "Record Feedback" form shown once a Submission exists; after recording, the form is replaced by the read-only Feedback (immutable); disabled with a message when no Submission yet.
- Student Milestone detail: Feedback shown read-only when present.

### Data
`Feedback` (M1): unique `(milestoneId, teamId)`, FK `submissionId`. No further migration.

## 3. Acceptance Criteria

| AC | Given / When | Then |
|----|--------------|------|
| **AC-06-01** | assigned Supervisor records Feedback while a Submission exists | 201; persisted; bound to the current Submission |
| **AC-06-02** | Feedback recorded **before** the deadline (a Submission already exists) | 201 (allowed, D-03); Milestone status → Completed |
| **AC-06-03** | Feedback attempted with no Submission (incl. a Missed Milestone) (BR-05) | 422 `NO_SUBMISSION` |
| **AC-06-04** | a second Feedback attempted for the same (Team, Milestone) (BR-06) | 409; the original is unchanged |
| **AC-06-05** | a Student attempts to record Feedback | 403 |
| **AC-06-06** | an unassigned Supervisor attempts to record Feedback | 404 |
| **AC-06-07** | a team member / the assigned Supervisor GETs the Feedback | 200 with the text; an outsider → 404 |
| **AC-06-08** | Feedback is recorded, then a (hypothetical) later submission context is inspected | the Feedback's `submissionId` equals the Submission current at recording time (BR-18) |

## 4. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected |
|------|----|-------|----------------------|--------|----------|
| TEST-06-01 | AC-06-01 | API/DB | submission exists; assigned supervisor | POST feedback | 201; row persisted with submissionId |
| TEST-06-02 | AC-06-02 | API | submission exists; before deadline (clock) | POST feedback | 201; status Completed |
| TEST-06-03 | AC-06-03 | API | milestone with no submission (incl. past-deadline Missed) | POST feedback | 422 NO_SUBMISSION |
| TEST-06-04 | AC-06-04 | API/DB | feedback already exists | POST feedback again | 409; original unchanged |
| TEST-06-05 | AC-06-05 | API | student session | POST feedback | 403 |
| TEST-06-06 | AC-06-06 | API | unassigned supervisor | POST feedback | 404 |
| TEST-06-07 | AC-06-07 | API | feedback exists | GET as member, as assigned supervisor, as outsider | 200, 200, 404 |
| TEST-06-08 | AC-06-08 | API/DB | submission current = S | POST feedback | stored `submissionId` == S (BR-18) |

## 5. Definition of Done
Product DoD + : immutability proven (second POST → 409, original intact, BR-06); no-submission rejection
covered incl. Missed (BR-05); before-deadline allowance verified (D-03); association to current submission
asserted (BR-18) and kept valid by the F-05 freeze (BR-20); forbidden role/ownership covered. TDD red→green
for BR-05 and BR-06.

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial contract. |
| 0.2 | 2026-11-07 | team | Noted BR-20 freeze so AC-06-08 (association) holds permanently (D-09). |
