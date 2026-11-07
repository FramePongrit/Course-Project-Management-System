# Feature Inventory
**Product:** Course Project Management System (CPMS) · Baseline for Deliverable 1

Each feature has a stable ID, the requirements it realizes, its dependencies, and the sprint that
implements and verifies it. Full per-feature engineering contracts for Sprint 1 live in
[`docs/sprints/sprint-1/`](sprints/sprint-1/). The requirement-level matrix is in
[`docs/traceability.md`](traceability.md).

## Foundation (cross-cutting, established in Sprint 1)

| ID | Feature | Realizes | Depends on | Sprint |
|----|---------|----------|-----------|:--:|
| **F-01** | **Authentication** — login, logout, current-user identity; email + bcrypt password; JWT httpOnly cookie session. | FR-01, FR-02, FR-03, BR-14, BR-15 | — | 1 |
| **F-02** | **Authorization & ownership** — server-side role and record-ownership enforcement middleware/guards (cross-cutting responsibility used by every protected endpoint). | BR-17, NFR-01, NFR-02 | F-01 | 1 |
| **F-03** | **Seed data** — Course offering, Supervisors, Students, Teams, Memberships, Projects, and demo Milestones (incl. one past-deadline Milestone, A-06). | A-01..A-07 | schema | 1 |

## Sprint 1 — domain slice

| ID | Feature | Realizes | Depends on | Sprint |
|----|---------|----------|-----------|:--:|
| **F-04** | **Milestone creation** — Supervisor creates a Milestone (name, description, future deadline) for a supervised Project; immutable in Sprint 1. | FR-11, FR-12, BR-03, BR-04, BR-08, BR-19 | F-01, F-02, F-03 | 1 |
| **F-05** | **Submission create/overwrite** — Student of the owning Team submits/overwrites title, description, link before cutoff; one current record per Team/Milestone; audit fields. | FR-15, FR-16, BR-01, BR-02, BR-07, NFR-08, NFR-10 | F-04 | 1 |
| **F-06** | **Feedback recording** — assigned Supervisor records one immutable Feedback once a Submission exists. | FR-18, FR-19, BR-05, BR-06, BR-18 | F-05 | 1 |
| **F-07** | **Milestone status derivation** — compute Open / Submitted / Awaiting Feedback / Completed / Missed. | FR-20, BR-16, BR-19 | F-04, F-05, F-06 | 1 |
| **F-08** | **Project progress view** — list a Project's Milestones with derived status, no percentage. | FR-21, FR-10 | F-07 | 1 |

## Sprint 2 — core expansion

| ID | Feature | Realizes | Depends on | Sprint |
|----|---------|----------|-----------|:--:|
| **F-09** | **Supervisor Invitation** — create/revoke a single-use, 48h, university-domain invitation to an assigned Team. | FR-04, FR-05, BR-09, BR-10, BR-11 | F-01, F-02 | 2 |
| **F-10** | **Student account activation** — accept an Invitation: set password, create Membership, account → ACTIVE. | FR-06, BR-11, BR-12, BR-14, BR-15 | F-09 | 2 |
| **F-11** | **Team creation** — Supervisor creates a Team, auto-assigned to self; unique name. | FR-07, BR-13 | F-01, F-02 | 2 |
| **F-12** | **Project creation with Team** — Supervisor creates a Project together with a new assigned Team. | FR-08 | F-11 | 2 |
| **F-13** | **Membership management** — Supervisor removes a Membership before the Team's first Submission; lock after. | FR-09, BR-12 | F-10 | 2 |
| **F-14** | **Submission revisions** — each submit/resubmit creates an immutable numbered revision; newest is current. Evolves F-05. | FR-17, BR-18 | F-05 | 2 |

## Sprint 3 — completion, reporting, hardening

| ID | Feature | Realizes | Depends on | Sprint |
|----|---------|----------|-----------|:--:|
| **F-15** | **Milestone edit/delete** — Supervisor edits or deletes a Milestone until the Team's first Submission exists. | FR-13, FR-14, BR-08 | F-04, F-05 | 3 |
| **F-16** | **Supervisor progress board** — cross-project board filtered by Project, Team, Milestone status. *(The meaningful Sprint 3 workflow demonstrated at Deliverable 2; reuses F-07.)* | FR-22 | F-07, F-08 | 3 |
| **F-17** | **Supervisor summary/report** — counts by status and list of Missed Milestones across assigned Projects. | FR-23 | F-07 | 3 |
| **F-R** | **Hardening responsibility** — failure handling, usability, authorization review, regression suite. *(Responsibility, not a user feature.)* | NFR-01..NFR-10 | all | 3 |

## Reserved for group labs (kept out of the feature backlog)

| Lab | Due | Note |
|-----|-----|------|
| Lab 5 | 15 Nov | Containerize the accepted Sprint 1 release, CI/CD quality gate, GCP deploy. Verifies NFR-06, NFR-04 (redeploy). |
| Lab 6 | 22 Nov | Cross-team UAT + defect fix on the released version. |
| Lab 7 | 29 Nov | One approved change to an **already-implemented** behavior/rule (e.g. a late-submission grace period) + regression. **Candidate changes are deliberately not placed in any sprint backlog**, so Lab 7 changes existing behavior rather than shipping a planned feature. |

## Coverage summary

- Every Sprint-1 FR/BR/NFR is realized by F-01…F-08 and verified in Sprint 1 (see traceability).
- Later-sprint requirements have a feature and a sprint now; their detailed AC/tests are elaborated when their contract is opened.
- No baseline requirement is currently uncovered.
- Approved scope change: **D-08** moved Milestone edit/delete (F-15) from Sprint 2 to Sprint 3.

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial feature inventory. |
| 0.2 | 2026-11-07 | team | F-15 Milestone edit/delete allocated to Sprint 3 (D-08). |
