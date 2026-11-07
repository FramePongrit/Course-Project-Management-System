# Sprint 1 Engineering Contracts — Index
**Product:** CPMS · Deliverable 1 · Release target `v1.0.0-sprint1` on `main`

Each feature below has a contract: Feature SDS, UI/API/data spec, Acceptance Criteria (AC), Software Test
Specification (STS), and Definition of Done. IDs are stable and referenced from
[`docs/traceability.md`](../../traceability.md).

| Feature | Contract | AC range | Test range |
|---------|----------|----------|-----------|
| F-01 Authentication | [F-01-authentication.md](F-01-authentication.md) | AC-01-01…08 | TEST-01-01…09 |
| F-02 Authorization & ownership | [F-02-authorization.md](F-02-authorization.md) | AC-02-01…06 | TEST-02-01…06 |
| F-04 Milestone creation | [F-04-milestone-creation.md](F-04-milestone-creation.md) | AC-04-01…06 | TEST-04-01…06 |
| F-05 Submission create/overwrite | [F-05-submission.md](F-05-submission.md) | AC-05-01…09 | TEST-05-01…10 |
| F-06 Feedback recording | [F-06-feedback.md](F-06-feedback.md) | AC-06-01…08 | TEST-06-01…08 |
| F-07 Milestone status derivation | [F-07-milestone-status.md](F-07-milestone-status.md) | AC-07-01…07 | TEST-07-01…07 |
| F-08 Project progress view | [F-08-project-progress.md](F-08-project-progress.md) | AC-08-01…04 | TEST-08-01…04 |

F-03 (seed data) is specified in [`system-sds.md`](../../system-sds.md) §2.4; it has no AC of its own but is a
precondition for most tests below.

## Test levels and tooling

- **Unit** — domain services (status derivation, cutoff, validation) with an injectable clock. (Vitest/Jest)
- **API/integration** — Express routes against a real PostgreSQL test database via Prisma; asserts persistence and permissions. (Supertest + a disposable test DB)
- **UI/E2E** — selected critical journeys (Playwright):
  - **TEST-E2E-01:** Student logs in → submits → reloads and sees the persisted Submission (covers AC-05-01, AC-05-09, AC-08-01).
  - **TEST-E2E-02:** Supervisor logs in → records Feedback → status shows Completed (covers AC-06-01, AC-07-04).

Include negative and boundary tests. A screenshot or an AI statement that tests pass is **not** evidence;
retain the command, counts, results and tested commit.

## Product Definition of Done (applies to every Sprint-1 feature)

A feature is **Done** only when all of the following hold and are evidenced:

1. **Behavior implemented** as specified in its Feature SDS, across the layers it touches.
2. **All its AC verified** by executed automated tests at the right level; every AC maps to ≥1 passing test (NFR-07). Negative/boundary and role/ownership cases included.
3. **Business rules enforced on the backend** (not only the UI), including the DB constraints named in the contract.
4. **Persistence confirmed** against the real database (reload/restart retrieves the saved result, NFR-04).
5. **Reviewed & integrated:** Issue linked to the contract; feature branch (`NN-<feature-slug>` off `sprint-01`); teammate-reviewed PR into `sprint-01` with a substantive review; integrated and system tests run; release PR into `main`. Authors do not approve their own PR.
6. **Docs current:** README setup, env-var examples, and this contract updated if the design changed (revisions kept visible, justified).
7. **Evidence retained:** test command, counts, results and the tested commit; TDD red→green evidence for meaningful rule work; incomplete work or failed/skipped tests disclosed.

Completion is supported by execution evidence, never by an agent's claim.

## TDD note

For the meaningful rules (BR-01 cutoff, BR-02 one-current-submission, BR-05 missed, BR-06 feedback immutable,
BR-20 freeze-after-feedback, BR-16 status, BR-17 ownership), write the failing test first, then implement.
Keep the red→green history (a spec/test-first commit followed by the implementation commit makes the
sequence visible).

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial Sprint-1 contract index + Product DoD. |
| 0.2 | 2026-11-07 | team | Added E2E journeys (TEST-E2E-01/02) and BR-20 to the TDD list. |
