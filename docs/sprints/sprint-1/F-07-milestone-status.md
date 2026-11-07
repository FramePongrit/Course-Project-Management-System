# F-07 — Milestone Status Derivation
**Sprint 1** · Realizes FR-20, BR-16, BR-19 · Depends on: F-04, F-05, F-06

## 1. Feature SDS

### Behavior & workflow
Each Milestone's status is **computed** from its Submission, its Feedback, and the current time (ICT) — it is
never stored as user input. It is returned wherever a Milestone is shown (lists, detail, progress, and the
Sprint-3 board).

### Rule (BR-16) — state machine
Let `hasSubmission`, `hasFeedback`, and `past = now ≥ deadline` (ICT, BR-19).

| Status | Condition |
|--------|-----------|
| **Open** | `!hasSubmission && !past` |
| **Submitted** | `hasSubmission && !hasFeedback && !past` |
| **Awaiting Feedback** | `hasSubmission && !hasFeedback && past` |
| **Completed** | `hasFeedback` (any time — D-03) |
| **Missed** | `!hasSubmission && past` |

```
          ┌───────── submit (before deadline) ─────────┐
  Open ───┤                                             ├──▶ Submitted ──feedback──▶ Completed
    │     └── deadline passes, no submission ──▶ Missed  │                             ▲
    │                                                    │   deadline passes           │
    └────────────────────────────────────────────────── Awaiting Feedback ──feedback──┘
   (Completed is reachable from Submitted or Awaiting Feedback; Missed is terminal in Sprint 1)
```

- `Completed` is reachable **before** the deadline (feedback on a pre-deadline submission) or after.
- `Completed` is **terminal and final** in Sprint 1: once Feedback exists the Submission is frozen (BR-20), so no further change occurs.
- `Missed` is terminal in Sprint 1 (no late submission, BR-05).
- Time is read from a single **injectable clock** so the rule is unit-testable (NFR-09).

### Permissions
No endpoint of its own; the status appears only on resources the caller may already access (via F-02/F-08).

## 2. Implementation spec
- Pure function `deriveStatus({ hasSubmission, hasFeedback, deadline }, now)` in a domain service.
- Called when serializing Milestones in `GET …/milestones`, `GET /milestones/:id`, and `GET …/progress`.
- `now` injected (real clock in prod; fixed clock in tests).

## 3. Acceptance Criteria

| AC | Given | Then status |
|----|-------|-------------|
| **AC-07-01** | no submission, before deadline | Open |
| **AC-07-02** | submission, no feedback, before deadline | Submitted |
| **AC-07-03** | submission, no feedback, deadline passed | Awaiting Feedback |
| **AC-07-04** | feedback exists (before or after deadline) | Completed |
| **AC-07-05** | no submission, deadline passed | Missed |
| **AC-07-06** | any client attempts to set status directly | no such field/endpoint; status is always server-derived |
| **AC-07-07** | the clock is advanced across a deadline in a test | status transitions Open→Missed / Submitted→Awaiting Feedback accordingly (BR-19, ICT) |

## 4. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected |
|------|----|-------|----------------------|--------|----------|
| TEST-07-01 | AC-07-01 | Unit | no sub, now < deadline | deriveStatus | Open |
| TEST-07-02 | AC-07-02 | Unit | sub, no fb, now < deadline | deriveStatus | Submitted |
| TEST-07-03 | AC-07-03 | Unit | sub, no fb, now ≥ deadline | deriveStatus | Awaiting Feedback |
| TEST-07-04 | AC-07-04 | Unit | fb present (both now<dl and now≥dl) | deriveStatus | Completed |
| TEST-07-05 | AC-07-05 | Unit | no sub, now ≥ deadline | deriveStatus | Missed |
| TEST-07-06 | AC-07-06 | API | milestone response schema | inspect | status is read-only derived; no setter |
| TEST-07-07 | AC-07-07 | Unit/API | fixed clock before→after deadline | re-derive | transitions as specified |

## 5. Definition of Done
Product DoD + : every branch of the state machine has a unit test with a fixed clock (BR-16/BR-19/NFR-09);
status surfaces correctly in `GET …/milestones` and `…/progress`; no client-settable status field.
TDD red→green for the derivation function.

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial contract. |
| 0.2 | 2026-11-07 | team | Noted Completed is terminal/final once Feedback exists (BR-20). |
