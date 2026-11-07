# Requirements → Feature → Sprint → Verification Traceability
**Product:** CPMS · Baseline for Deliverable 1

Sprint 1 rows carry concrete Acceptance-Criteria and Test IDs (defined in the feature contracts under
[`docs/sprints/sprint-1/`](sprints/sprint-1/)). Later-sprint rows carry feature + sprint allocation now;
their AC/tests are elaborated when the contract is opened (per the course spec, later requirements need a
feature/responsibility and a sprint now, not yet executable tests).

Legend — Status: ✅ planned+specified · ⏳ planned (later sprint). Actual test run results are recorded in Part F / the Sprint-1 test report.

## Functional Requirements

| Requirement | Feature | Sprint | AC | Test | Status |
|-------------|---------|:--:|----|------|:--:|
| FR-01 Login | F-01 | 1 | AC-01-01, AC-01-02, AC-01-03, AC-01-07 | TEST-01-01, TEST-01-02, TEST-01-03, TEST-01-07 | ✅ |
| FR-02 Logout | F-01 | 1 | AC-01-06 | TEST-01-06 | ✅ |
| FR-03 Current user | F-01 | 1 | AC-01-04, AC-01-05 | TEST-01-04, TEST-01-05 | ✅ |
| FR-04 Create invitation | F-09 | 2 | — | — | ⏳ |
| FR-05 Revoke invitation | F-09 | 2 | — | — | ⏳ |
| FR-06 Activate account | F-10 | 2 | — | — | ⏳ |
| FR-07 Create Team | F-11 | 2 | — | — | ⏳ |
| FR-08 Create Project+Team | F-12 | 2 | — | — | ⏳ |
| FR-09 Remove Membership | F-13 | 2 | — | — | ⏳ |
| FR-10 View own/assigned | F-08 (+F-02) | 1 | AC-08-01, AC-08-02, AC-08-04 | TEST-08-01, TEST-08-02, TEST-08-04 | ✅ |
| FR-11 Create Milestone | F-04 | 1 | AC-04-01, AC-04-04, AC-04-05 | TEST-04-01, TEST-04-04, TEST-04-05 | ✅ |
| FR-12 View Milestones | F-04 / F-08 | 1 | AC-08-01 | TEST-08-01 | ✅ |
| FR-13 Edit Milestone | F-15 | 3 | — | — | ⏳ |
| FR-14 Delete Milestone | F-15 | 3 | — | — | ⏳ |
| FR-15 Submit/overwrite | F-05 | 1 | AC-05-01, AC-05-02, AC-05-09 | TEST-05-01, TEST-05-02, TEST-05-09 | ✅ |
| FR-16 View Submission | F-05 | 1 | AC-05-09 | TEST-05-09 | ✅ |
| FR-17 Revision history | F-14 | 2 | — | — | ⏳ |
| FR-18 Record Feedback | F-06 | 1 | AC-06-01, AC-06-02 | TEST-06-01, TEST-06-02 | ✅ |
| FR-19 View Feedback | F-06 | 1 | AC-06-07 | TEST-06-07 | ✅ |
| FR-20 Status derivation | F-07 | 1 | AC-07-01…AC-07-06 | TEST-07-01…TEST-07-06 | ✅ |
| FR-21 Project progress | F-08 | 1 | AC-08-01, AC-08-02, AC-08-03 | TEST-08-01, TEST-08-02, TEST-08-03 | ✅ |
| FR-22 Progress board | F-16 | 3 | — | — | ⏳ |
| FR-23 Summary/report | F-17 | 3 | — | — | ⏳ |

## Business Rules

| Rule | Feature | Sprint | AC | Test | Status |
|------|---------|:--:|----|------|:--:|
| BR-01 Submission cutoff | F-05 | 1 | AC-05-03 | TEST-05-03 | ✅ |
| BR-02 One current Submission | F-05 | 1 | AC-05-05 | TEST-05-05 | ✅ |
| BR-03 Future deadline | F-04 | 1 | AC-04-02 | TEST-04-02 | ✅ |
| BR-04 Unique Milestone name | F-04 | 1 | AC-04-03 | TEST-04-03 | ✅ |
| BR-05 Missed can't submit/feedback | F-06 (+F-05) | 1 | AC-06-03 | TEST-06-03 | ✅ |
| BR-06 Feedback single & immutable | F-06 | 1 | AC-06-04 | TEST-06-04 | ✅ |
| BR-07 Submission not deletable | F-05 | 1 | AC-05-08 | TEST-05-08 | ✅ |
| BR-08 Milestone immutable S1 / editable until first submission | F-04 / F-15 | 1 / 3 | AC-04-06 | TEST-04-06 | ✅ (S1 part) |
| BR-09 Invitation single-use/48h | F-09 | 2 | — | — | ⏳ |
| BR-10 University domain | F-09 | 2 | — | — | ⏳ |
| BR-11 No duplicate / already-in-team | F-09 / F-10 | 2 | — | — | ⏳ |
| BR-12 Membership immutable after first submission | F-13 | 2 | — | — | ⏳ |
| BR-13 Unique Team name | F-11 | 2 | — | — | ⏳ |
| BR-14 Unique email, one role | F-01 | 1 | AC-01-09 | TEST-01-08 | ✅ |
| BR-15 Hashed password; INVITED can't login | F-01 | 1 | AC-01-07 | TEST-01-07 | ✅ |
| BR-16 Status derivation | F-07 | 1 | AC-07-01…AC-07-06 | TEST-07-01…TEST-07-06 | ✅ |
| BR-17 Ownership/role access | F-02 | 1 | AC-02-01…AC-02-06 | TEST-02-01…TEST-02-06 | ✅ |
| BR-18 Feedback bound to current Submission | F-06 | 1 | AC-06-08 | TEST-06-08 | ✅ |
| BR-19 ICT deadlines | F-04 / F-07 | 1 | AC-07-07 (clock) | TEST-07-07 | ✅ |
| BR-20 Submission frozen after Feedback | F-05 / F-06 | 1 | AC-05-10 | TEST-05-11 | ✅ |

## Non-Functional Requirements

| NFR | Feature / responsibility | Sprint | Verification | Status |
|-----|--------------------------|:--:|--------------|:--:|
| NFR-01 Unauth rejected | F-02 | 1 | AC-02-01 / TEST-02-01 | ✅ |
| NFR-02 Server-side authz | F-02 | 1 | AC-02-02…06 / TEST-02-02…06 | ✅ |
| NFR-03 Password hashing | F-01 | 1 | TEST-01-09 (hash) + review | ✅ |
| NFR-04 Persistence survives restart | F-05/F-06 + system | 1 | TEST-05-10 (reload) + manual restart; redeploy in Lab 5 | ✅ (local) |
| NFR-05 Performance p95 | system responsibility | 2 | measured, reported at D2 | ⏳ |
| NFR-06 Containerizable/local setup | system responsibility | 1 design / Lab 5 | README run; Lab 5 build | ✅ design |
| NFR-07 AC→test coverage | all S1 features | 1 | this matrix + test run output | ✅ |
| NFR-08 Input validation | F-04, F-05 | 1 | AC-04-02, AC-05-04 / TEST-04-02, TEST-05-04 | ✅ |
| NFR-09 ICT time consistency | F-07 | 1 | TEST-07-07 (injectable clock) | ✅ |
| NFR-10 Submission audit | F-05 | 1 | AC-05-01, AC-05-02 / TEST-05-01, TEST-05-02 | ✅ |

## UI / E2E journeys (selected, Sprint 1)

| Test | Journey | Covers AC | Level |
|------|---------|-----------|:--:|
| TEST-E2E-01 | Student logs in → submits a Milestone → reloads and sees the persisted Submission | AC-05-01, AC-05-09, AC-08-01 | E2E |
| TEST-E2E-02 | Supervisor logs in → records Feedback on a submitted Milestone → status shows Completed | AC-06-01, AC-07-04 | E2E |

## Gaps and approved changes

- **Uncovered requirements:** none.
- **Approved baseline changes since the initial glossary:**
  - **D-03** — Feedback is recordable before the deadline ([ADR-0003](adr/0003-feedback-recordable-once-submission-exists.md)); reflected in FR-18, BR-16, F-06, F-07.
  - **D-08** — Milestone edit/delete moved from Sprint 2 to Sprint 3; reflected in FR-13, FR-14, BR-08, F-15, [`sprints/plan.md`](sprints/plan.md), [CONTEXT.md](../CONTEXT.md).
  - **D-09** — Submission is frozen once Feedback exists (BR-20); reflected in F-05 (AC-05-10/TEST-05-11), F-06, F-07, [CONTEXT.md](../CONTEXT.md).

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial traceability matrix. |
| 0.2 | 2026-11-07 | team | Added BR-20 row and E2E journeys; fixed BR-14→AC-01-09; recorded approved changes D-08, D-09. |
