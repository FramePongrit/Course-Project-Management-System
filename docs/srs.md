# Software Requirements Specification (SRS)
**Product:** Course Project Management System (CPMS)
**Theme:** 6 — Course Project Management System
**Semester:** 1/2026 · **Status:** Baseline for Deliverable 1 · **Timezone of record:** Asia/Bangkok (ICT)

The ubiquitous-language glossary in [`/CONTEXT.md`](../CONTEXT.md) is normative; this SRS uses those terms exactly.
Architecture decisions are recorded in [`docs/adr/`](adr/).

---

## 1. Stakeholder problem and context

A course (or supervision program) runs many student **Projects** at once. Each **Team** of **Students** must
submit **milestone** work (a title, a short description, and a link to the actual artifact) and receive a
**Supervisor's** written **Feedback**. Supervisors need to create milestones for the teams they supervise,
read what each team submitted, give feedback, and see each project's progress. Students need to submit before
a deadline and read their feedback. The system must keep every team's work private to that team and its one
assigned supervisor, and must enforce that privacy on the server — never only by hiding buttons.

Chosen context: a **single course offering** for one semester containing multiple Projects. The product is
one continuous build delivered over three sprints.

## 2. Actors

| Actor | Description | Role value |
|-------|-------------|-----------|
| **Student** | A named user with a unique student ID who belongs to exactly one Team and may submit that Team's milestone work. Not an administrator. | `STUDENT` |
| **Supervisor** | A named user assigned to supervise particular Teams; creates milestones and records feedback only for those Teams. Provisioned by system setup; cannot self-register. | `SUPERVISOR` |
| **Anonymous / unauthenticated client** | Any request without a valid session. Allowed only to reach the login endpoint; every other protected endpoint must reject it. | — |

There is **no Administrator actor** in this theme (see exclusions).

## 3. Product scope

**In scope (whole product, across three sprints):**

- Authentication (email + application-specific password), logout, current-user identity, server-side authorization.
- One Course offering containing multiple Projects; each Team owns exactly one Project and has exactly one assigned Supervisor.
- Supervisor creates Milestones (deadline-bound) for supervised Projects.
- Students create / overwrite a Submission (title, description, HTTP(S) link) per Milestone, before the deadline.
- Supervisor records a single Feedback per Team per Milestone once a Submission exists.
- System-derived Milestone **status** and per-Project **Progress**.
- Sprint 2: Supervisor Invitations and Student account activation; Supervisor creation of Teams and Projects; Membership management; immutable numbered Submission revisions.
- Sprint 3: Milestone editing/deletion (until first Submission); Supervisor cross-project progress board with filters; Supervisor summary/report; hardening, failure handling, regression.

**Out of scope — explicit exclusions:**

| # | Exclusion | Rationale / ADR |
|---|-----------|-----------------|
| EX-01 | Multiple course offerings, course catalog, multi-course workspace | Exactly one offering in **all sprints** (not "one at a time" — there is no second course to switch to). Multi-course is a documented future direction, not built; see the note below. ([CONTEXT](../CONTEXT.md)) |
| EX-02 | Public self-registration | Membership is controlled; entry is invitation-only ([ADR-0002](adr/0002-invitation-based-student-accounts.md)) |
| EX-03 | Password recovery / reset (any sprint) | Descoped to keep effort on domain; SSO is the real-system path ([ADR-0004](adr/0004-authentication-and-session.md)) |
| EX-04 | University SSO (OAuth/SAML) | Cannot assume access to the university IdP ([ADR-0002](adr/0002-invitation-based-student-accounts.md)) |
| EX-05 | Grades, scores, completion percentage, weighting | Feedback is text only ([CONTEXT](../CONTEXT.md)) |
| EX-06 | Administrator role / account administration | Not required by Theme 6 (Student + Supervisor only) |
| EX-07 | File uploads | Submission is a link only |
| EX-08 | Real external email / messaging | Invitation link is delivered in-app (simulated); synthetic data only |
| EX-09 | Multi-role accounts | Each account has exactly one role |
| EX-10 | Formative feedback, multiple feedback entries, feedback history | Single immutable feedback per Milestone per Team |
| EX-11 | Concurrent-edit conflict detection | Last-write-wins, protected by a uniqueness constraint (BR-02) |
| EX-12 | Global cross-supervisor progress board | Supervisors see only their assigned Projects |

> **Future directions (recognized, not in scope for this product).** A university-wide deployment would
> realistically be multi-course; this product deliberately models a single course because the theme scopes it
> that way, the graded domain rules (cutoff, status, feedback, ownership) are identical at any course count,
> and a single-course deployment (one instance per course offering) is itself a legitimate tenancy model. The
> design avoids foreclosing the following extensions, but none is implemented in Sprints 1–3:
>
> 1. **Multi-course tenancy.** Introduce a `Course` entity with course-scoped Teams, Projects and Milestones,
>    plus course selection and course administration. The deep change is **not** the extra tables but the
>    **identity model**: this product's simplification is "one account = one role = one team"
>    (`User.role` and a unique `Membership.userId`). A real multi-course system breaks that — the same person
>    can be a Student in one course and a Supervisor/TA in another, and a Student enrols in many courses — so
>    **role and team membership must move from the account to a per-course membership** (`Membership` carries
>    `courseId` and the role; `User` loses its single global role; uniqueness becomes "within a course"). It
>    would also need an administrative actor (currently EX-06) and, realistically, enrolment/integration with
>    a university SIS. This is a larger, LMS-like product tier.
> 2. **University SSO** replacing the application-specific password, isolated to the credential-check step so
>    the invitation-based membership model and the session/authorization design are unaffected
>    (see [ADR-0004](adr/0004-authentication-and-session.md)).
>
> Keeping these out now is a scope choice, not an oversight: the current design records exactly what each
> extension would change, so neither is foreclosed.

## 4. Functional Requirements (FR)

IDs are stable. "Sprint" is the sprint that **implements and verifies** the FR.

### Authentication and account
| ID | Requirement | Sprint |
|----|-------------|:--:|
| FR-01 | A user logs in with email and password through a single endpoint; the account's stored role governs access. | 1 |
| FR-02 | A logged-in user logs out, ending the browser session. | 1 |
| FR-03 | A logged-in user retrieves their current identity (id, name, email, role) from the server. | 1 |
| FR-04 | A Supervisor creates an Invitation for a university-domain email to one assigned Team. | 2 |
| FR-05 | A Supervisor revokes an outstanding Invitation, invalidating its token. | 2 |
| FR-06 | An invited person activates a Student account by setting a password via a valid Invitation token, creating their Membership. | 2 |

### Teams, Projects, Membership
| ID | Requirement | Sprint |
|----|-------------|:--:|
| FR-07 | A Supervisor creates a Team, automatically assigned to that Supervisor. | 2 |
| FR-08 | A Supervisor creates a Project together with a new assigned Team. | 2 |
| FR-09 | A Supervisor removes a Student's Membership from a Team before the Team's first Submission. | 2 |
| FR-10 | A Student views their own Team and Project; a Supervisor views the Teams and Projects they are assigned. | 1 |

### Milestones
| ID | Requirement | Sprint |
|----|-------------|:--:|
| FR-11 | A Supervisor creates a Milestone (name, description, future deadline) for a supervised Project. | 1 |
| FR-12 | A Team member and the assigned Supervisor view a Project's Milestones. | 1 |
| FR-13 | A Supervisor edits a Milestone of a supervised Project until the Team's first Submission exists. | 3 |
| FR-14 | A Supervisor deletes a Milestone of a supervised Project until the Team's first Submission exists. | 3 |

### Submissions
| ID | Requirement | Sprint |
|----|-------------|:--:|
| FR-15 | A Student of the owning Team creates or overwrites the Team's Submission (title, description, link) for a Milestone before its deadline. | 1 |
| FR-16 | A Team member views the current Submission; the assigned Supervisor views it read-only. | 1 |
| FR-17 | A Team member and the assigned Supervisor view the Team's immutable numbered Submission revisions. | 2 |

### Feedback
| ID | Requirement | Sprint |
|----|-------------|:--:|
| FR-18 | The assigned Supervisor records a single Feedback for a Team's Submission once a Submission exists. | 1 |
| FR-19 | A Team member and the assigned Supervisor view the recorded Feedback. | 1 |

### Progress, status, reporting
| ID | Requirement | Sprint |
|----|-------------|:--:|
| FR-20 | The system derives each Milestone's status (Open, Submitted, Awaiting Feedback, Completed, Missed). | 1 |
| FR-21 | A Team member and the assigned Supervisor view a Project's progress (its Milestones and derived statuses), without a numeric percentage. | 1 |
| FR-22 | A Supervisor views and filters a progress board across their assigned Projects by Project, Team and Milestone status. | 3 |
| FR-23 | A Supervisor views a summary/report of assigned Projects (counts by status, list of Missed Milestones). | 3 |

## 5. Business Rules (BR)

| ID | Rule | Enforced where | Sprint |
|----|------|----------------|:--:|
| BR-01 | **Submission cutoff:** the server rejects creating or modifying a Submission when current time ≥ the Milestone deadline. | API + service | 1 |
| BR-02 | A Team has **at most one current Submission per Milestone**. Guaranteed by a DB unique constraint on `(milestone_id, team_id)` and an upsert; last write wins. | DB constraint + service | 1 |
| BR-03 | A Milestone's deadline must be **in the future at creation**. | API validation | 1 |
| BR-04 | A Milestone's **name is unique within its Project**. | DB constraint + service | 1 |
| BR-05 | A **Missed Milestone** (deadline passed with no Submission) cannot receive a Submission or Feedback. | service | 1 |
| BR-06 | **Feedback is single and immutable:** at most one per Team per Milestone; it cannot be edited or deleted after recording. | DB constraint + service | 1 |
| BR-07 | A **Submission record cannot be deleted.** | no endpoint; service | 1 |
| BR-08 | A **Milestone is immutable in Sprint 1**; from Sprint 3 (moved from Sprint 2, D-08) it may be edited or deleted **only until the Team's first Submission exists**. | service | 1 / 3 |
| BR-09 | An **Invitation is single-use**, expires 48 hours after creation, and revocation or replacement invalidates the previous token. | service | 2 |
| BR-10 | An Invitation's email must be under the **configured university domain**. | API validation | 2 |
| BR-11 | An email **already associated with a Team cannot be invited**, and duplicate accounts are never created. | DB constraint + service | 2 |
| BR-12 | A **Membership is immutable after the Team's first Submission**; before then a removed Student no longer belongs to the Team. | service | 2 |
| BR-13 | A **Team name is unique within the Course offering**. | DB constraint | 2 |
| BR-14 | **Email is unique across accounts; each account has exactly one role.** | DB constraint | 1 |
| BR-15 | Passwords are stored only as a bcrypt hash; an **INVITED account (no password) cannot log in**. | service | 1 / 2 |
| BR-16 | Milestone **status derivation**: Open (no Submission, before deadline); Submitted (Submission, no Feedback, before deadline); Awaiting Feedback (Submission, no Feedback, deadline passed); Completed (Feedback exists, any time); Missed (deadline passed, no Submission). | service (derived, never stored as user input) | 1 |
| BR-17 | **Ownership/role access:** a Student may access only their own Team's data; a Supervisor only their assigned Teams' data. Enforced on the backend from the server-derived identity, never from client-supplied id or role. | service / middleware | 1 |
| BR-18 | **Feedback is associated with the current Submission** (its latest revision at the time Feedback is recorded). | service | 1 / 2 |
| BR-19 | Milestone deadlines are expressed and evaluated in **Asia/Bangkok (ICT)**; all timestamps are stored in UTC. | service | 1 |
| BR-20 | **A Submission cannot be overwritten once Feedback has been recorded** for that Team's Milestone; the attempt is rejected (409 `FEEDBACK_RECORDED`). Milestone status Completed is therefore final. | service | 1 |

## 6. Non-Functional Requirements (NFR)

| ID | Requirement | Measurable target | Verification | Sprint |
|----|-------------|-------------------|--------------|:--:|
| NFR-01 | Unauthenticated requests to protected endpoints are rejected without leaking private data. | 100% of protected endpoints return 401 with no domain payload when no valid session. | API integration test per protected route group. | 1 |
| NFR-02 | Authorization is enforced server-side for every protected operation. | Every protected op has a passing forbidden-access test (role + ownership). | API integration tests. | 1 |
| NFR-03 | Passwords are hashed, never stored or logged in plaintext. | bcrypt cost ≥ 10; no plaintext password in DB rows or application logs. | Code review + unit test on hashing; log inspection. | 1 |
| NFR-04 | Persisted data survives application restart and redeployment. | After restart, previously saved Submission/Feedback is retrievable unchanged. | Integration test against real DB + manual restart check (full redeploy check in Lab 5). | 1 |
| NFR-05 | API responses are acceptably fast at demo scale. | p95 < 300 ms for read endpoints on seeded demo data, local. | Measured and reported. | 2 |
| NFR-06 | The application runs from documented local setup and is containerizable. | `README` steps bring up DB + API + UI; Dockerfile builds (container run verified in Lab 5). | Manual setup run; Lab 5 CI/build. | 1 (design) / Lab 5 |
| NFR-07 | Every Sprint 1 Acceptance Criterion maps to at least one executed automated test. | 100% of Sprint 1 AC covered; results retained with the release commit. | Traceability matrix + test run output. | 1 |
| NFR-08 | Inputs are validated. | Link must be a well-formed `http(s)` URL; required text fields non-empty and length-bounded; invalid input returns 422 without persistence. | Unit + API tests. | 1 |
| NFR-09 | Time-based rules are evaluated consistently in ICT. | Cutoff and status computed from a single server clock in ICT; tests use an injectable clock. | Unit tests with fixed clock. | 1 |
| NFR-10 | Submission authorship is auditable. | Each Submission records who first submitted and who last updated it, with timestamps. | Integration test asserting audit fields. | 1 |

## 7. Assumptions

- A-01: Exactly one Course offering exists; it is established by seed/system setup, not by any user action.
- A-02: Supervisor accounts are provisioned by system setup (seed in Sprint 1); they are never self-registered or invited.
- A-03: Each Team has exactly one assigned Supervisor and owns exactly one Project.
- A-04: A Student belongs to exactly one Team.
- A-05: The configured university email domain is a single value supplied by configuration (e.g. `UNIVERSITY_EMAIL_DOMAIN`).
- A-06: Demo/UAT requires **two** seeded past-deadline Milestones (created via seed, not via the future-deadline API, which would reject them): one **with no Submission** (demonstrates Missed) and one **with a Submission timestamped before its deadline** (demonstrates Awaiting Feedback). These states are otherwise unreachable because the API blocks post-deadline submission (BR-01). Tests inject a fixed clock through a `createApp({ clock })` factory so the cutoff and status rules are verifiable at the API level.
- A-07: All synthetic demo passwords are documented only in a private local handoff, never committed.

## 8. Design decisions and resolved questions

| ID | Question | Decision | Source |
|----|----------|----------|--------|
| D-01 | Model Project separately from Team? | Yes — Team = people, Project = work; one-to-one in this product. | [ADR-0001](adr/0001-separate-project-from-team.md) |
| D-02 | How do Students get accounts? | Invitation-based activation; no public registration; no SSO (cannot assume IdP). | [ADR-0002](adr/0002-invitation-based-student-accounts.md) |
| D-03 | When can a Supervisor record Feedback? | Once a Submission exists, **before or after** the deadline; status becomes Completed once Feedback exists. | [ADR-0003](adr/0003-feedback-recordable-once-submission-exists.md) |
| D-04 | Login identity and session mechanism? | Email + bcrypt password; single login endpoint; **JWT in an httpOnly cookie** (SameSite=Lax, Secure in prod), ~8h expiry; role/authz re-derived from DB each request. | [ADR-0004](adr/0004-authentication-and-session.md) |
| D-05 | How is an Invitation / activation link delivered given no external email? | Shown on the Supervisor's Invitations page to copy, and persisted (the page doubles as an audit log). | [ADR-0004](adr/0004-authentication-and-session.md) §onboarding |
| D-06 | Password recovery? | Explicitly excluded (EX-03) in all sprints. | [ADR-0004](adr/0004-authentication-and-session.md) |
| D-07 | Concurrency on first Submission? | Not "conflict detection"; a DB unique constraint on `(milestone_id, team_id)` + upsert prevents two current Submissions. Two concurrent first-submits both succeed and leave exactly one row (BR-02). | advisor review, this SRS |
| D-08 | Which sprint owns Milestone edit/delete? | **Moved from Sprint 2 to Sprint 3** to relieve the overloaded Sprint-2 / Lab-5 / Lab-6 window; recorded as an approved scope change. | team decision, this baseline |
| D-09 | Can a Submission change after Feedback (given D-03 allows pre-deadline Feedback)? | **No.** Recording Feedback freezes the Submission; a later overwrite is rejected (409 `FEEDBACK_RECORDED`, BR-20). This preserves the submission/feedback association required by the theme and makes Completed final. | team decision, this baseline |

## 9. Coverage note

Every FR, BR and important NFR is allocated to a feature and sprint in
[`docs/features.md`](features.md) and verified through [`docs/traceability.md`](traceability.md).
No baseline requirement is currently uncovered.

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial Deliverable-1 SRS baseline. |
| 0.2 | 2026-11-07 | team | Added BR-20 (Submission frozen after Feedback, D-09); moved Milestone edit/delete to Sprint 3 (D-08); A-06 now requires two past-deadline seeded Milestones + injectable clock. |
| 0.3 | 2026-11-07 | team | Clarified EX-01 as a permanent single-course exclusion (not "one at a time") and added a Future-directions note (multi-course tenancy, SSO). |
| 0.4 | 2026-11-07 | team | Deepened the Future-directions note: multi-course's real change is the identity model (role/membership move from account to per-course), not extra tables. |
