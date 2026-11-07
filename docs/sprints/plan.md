# Three-Sprint Plan
**Product:** CPMS · Baseline for Deliverable 1

The three sprints together cover the whole product baseline (every FR/BR/important NFR in
[`docs/srs.md`](../srs.md)). Feature IDs are defined in [`docs/features.md`](../features.md).

| Sprint | Window / checkpoint | Goal |
|--------|---------------------|------|
| 1 | now → **8 Nov** (Deliverable 1) | A small, deployable, tested domain slice with authentication, authorization and persistence. |
| 2 | → **29 Nov** (Deliverable 2) | Core expansion: controlled account/team/project creation and submission revisions. |
| 3 | progress by 29 Nov → complete **13 Dec** (Final) | Remaining features, reporting, integration and hardening. |

---

## Sprint 1 — Small deployable slice

**Goal:** a logged-in Supervisor creates a Milestone; a logged-in Student of the owning Team submits
(and can overwrite before the deadline); the Supervisor records Feedback; the system shows each Milestone's
derived status and the Project's progress — all persisted, with access enforced on the backend and tested.

**Features:** F-01 Authentication · F-02 Authorization/ownership · F-03 Seed data · F-04 Milestone creation ·
F-05 Submission create/overwrite · F-06 Feedback · F-07 Status derivation · F-08 Project progress.

**Dependencies:** F-02 depends on F-01; all domain features depend on F-01/F-02/F-03; F-05→F-04; F-06→F-05;
F-07→F-04/F-05/F-06; F-08→F-07.

**Business rules landed:** BR-01, BR-02, BR-03, BR-04, BR-05, BR-06, BR-07, BR-08 (S1 part), BR-14, BR-15,
BR-16, BR-17, BR-18, BR-19.

**Completion outcome (Definition of Done for the sprint):**
- Release on `main` (tagged `v1.0.0-sprint1`), runnable from the documented local setup.
- The full domain journey works end to end through UI → API → DB, and the saved result is retrievable.
- A meaningful rule rejection (cutoff BR-01 and/or duplicate BR-02) and a forbidden operation are demonstrated.
- Automated tests for login (valid/invalid), unauthenticated access, forbidden role/ownership, the domain rules and persistence all pass; every Sprint-1 AC maps to an executed test (NFR-07).
- Each feature went through Issue → feature branch (`NN-<feature-slug>`) → teammate-reviewed PR into `sprint-01` staging → integrated → release PR into `main`.

**Scope note:** all accounts, Teams, Memberships and Projects are **seeded** in Sprint 1 — the sprint delivers
the domain write/transition slice (create milestone, submit/overwrite, feedback, status), not account or team
administration, which is Sprint 2. One seeded Milestone has a **past deadline** (A-06) so the cutoff, Missed
and Awaiting-Feedback paths are demonstrable without waiting.

## Sprint 2 — Core expansion

**Goal:** open up controlled creation — Supervisors invite Students (who activate their own accounts), create
Teams and Projects, and manage Membership; Submissions gain immutable numbered revision history.

**Features:** F-09 Supervisor Invitation · F-10 Student activation · F-11 Team creation · F-12 Project+Team
creation · F-13 Membership management · F-14 Submission revisions.

**Dependencies:** F-10→F-09; F-12→F-11; F-13→F-10; F-14 evolves F-05. Invitations (F-09) need a Team to
invite into, so F-11/F-12 land alongside or before F-09 in the sprint.

**Migration:** **M2** — add `Invitation`; add `SubmissionRevision` + `Submission.currentRevisionId`; backfill
one revision per existing Submission (additive; see [`system-sds.md`](../system-sds.md) §2.4).

**Business rules landed:** BR-09, BR-10, BR-11, BR-12, BR-13, and BR-18 extended to the current revision.

**Completion outcome:** all Sprint-2 features complete, reviewed, integrated and verified against contracts;
Sprint-2 release on `main`; earlier Sprint-1 behavior, auth, permissions and ownership still pass (regression).

**Capacity reserved for labs in this window:** **Lab 5** (15 Nov — containerize/CI-CD/GCP the Sprint-1
release) and **Lab 6** (22 Nov — cross-team UAT + fix one accepted defect). Do not fill the whole window with
features; these labs are first-class work on the same application.

## Sprint 3 — Completion and hardening

**Goal:** finish the remaining planned features, add supervisor reporting, and harden the product
(failure handling, usability, authorization review, regression).

**Features:** F-15 Milestone edit/delete (until first Submission) · F-16 Supervisor progress board
(cross-project filters) · F-17 Supervisor summary/report · F-R hardening responsibility.

**Dependencies:** F-15→F-04/F-05; F-16→F-07/F-08; F-17→F-07.

**The Sprint-3 workflow demonstrated at Deliverable 2 (29 Nov):** **F-16 progress board** — it reuses the
F-07 status derivation, so it is the lowest-risk meaningful Sprint-3 feature to implement and test first
(Deliverable 2 requires at least one implemented, tested Sprint-3 workflow).

**Business rules landed:** BR-08 (edit/delete-until-first-submission part).

**Completion outcome:** complete product on `main` (tagged final release) deployed on GCP; all major
workflows and domain rules across the three sprints work; regression suite green; known debt disclosed;
demonstration video and final report prepared.

**Reserved for Lab 7 (29 Nov):** one approved change to an **already-implemented** behavior/rule — e.g. a
**late-submission grace period** that modifies BR-01, or changing the cutoff/status semantics. Such change
candidates are **deliberately kept out of the sprint backlog** so Lab 7 changes existing behavior (with a
failing-test-first, regression-safe process) rather than delivering a planned feature.

## Cross-sprint dependency summary

```
F-01 ─▶ F-02 ─▶ (all protected features)
F-03 (seed) ─▶ domain features
F-04 ─▶ F-05 ─▶ F-06 ─▶ F-07 ─▶ F-08          [Sprint 1]
F-11 ─▶ F-12 ;  F-09 ─▶ F-10 ─▶ F-13 ;  F-05 ─▶ F-14   [Sprint 2]
F-04/F-05 ─▶ F-15 ;  F-07/F-08 ─▶ F-16 ;  F-07 ─▶ F-17  [Sprint 3]
```

## Schedule anchors (ICT)

| Date | Milestone |
|------|-----------|
| 8 Nov | Deliverable 1 — Sprint 1 release + full baseline docs |
| 15 Nov | Lab 5 — deployed Sprint 1, CI/CD |
| 22 Nov | Lab 6 — cross-team UAT + defect fix |
| 29 Nov | Deliverable 2 (Sprint 2 complete + Sprint 3 progress) & Lab 7 |
| 1–11 Dec | Final examination period — product should already be substantially complete |
| 13 Dec | Final delivery — complete verified release + video |

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial three-sprint plan. |
| 0.2 | 2026-11-07 | team | Milestone edit/delete (F-15) confirmed in Sprint 3 (D-08). |
