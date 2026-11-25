# Lab 6 — Sprint 1 UAT handoff (Product Team: CPMS)

Course Project Management System (CPE 334 Theme 6). This document is everything the UAT Team needs to
test our Sprint 1 release without a verbal explanation.

## 1. Release under test

| Item | Value |
|------|-------|
| Repository | https://github.com/FramePongrit/Course-Project-Management-System |
| Sprint 1 baseline tag | `v1.0.0-sprint1` → `44f9470` (2026-11-12) |
| Release under test (main) | `2174e0f` (PR #32, 2026-11-22) |
| Deployed Cloud Run revision | `s87d9c6b4-00008-8lw` (Deploy demo run 45005139438, 2026-11-22 15:57 ICT, image `2174e0f…` @ `sha256:c28ef11d0445…`) |
| URL | https://s87d9c6b4-4d7hbszvwq-as.a.run.app |
| Browser | Any current Chrome / Edge / Firefox; times are shown in ICT (UTC+7) |

**Difference from the baseline tag.** Commits after `v1.0.0-sprint1` are Lab 5 delivery work only:
cloud configuration, Docker, CI, deployment docs (#8–#15), a UI fix for the artifact-link arrow (#25)
and JSON 404 for unknown `/api` routes (#30). No Sprint 2 or 3 feature is included.

**Accepted-for-test scope (Sprint 1).** F-01 Authentication, F-02 Authorization, F-04 Milestone
creation, F-05 Submission, F-06 Feedback, F-07 Milestone status, F-08 Project progress. Contracts:
`docs/sprints/sprint-1/`.

**Out of scope (do not test / not a defect if absent).** Account invitation/activation, editing or
deleting milestones, deleting submissions, grades/percentages, notifications, admin features
(Sprint 2/3 or explicitly excluded in the SRS).

## 2. Test accounts

All accounts are synthetic. **The password is sent privately** through our team chat; it is not in this
document or in Git. All accounts share the same password.

| Label | Role | Login email | Team / Project |
|-------|------|-------------|----------------|
| SUP-A | Supervisor | `prof.somchai@university.ac.th` | assigned to Team Alpha — "Course Project Management System" |
| SUP-B | Supervisor | `dr.ann@university.ac.th` | assigned to Team Beta — "Smart Campus Transit" |
| STU-A1 | Student | `alice@student.university.ac.th` | Team Alpha |
| STU-A2 | Student | `bob@student.university.ac.th` | Team Alpha |
| STU-B1 | Student | `charlie@student.university.ac.th` | Team Beta |

Use separate browser profiles (or one normal + one private window) when a case needs two users.
Click **Logout** (top right) when switching user in the same window.

Navigation: a supervisor opens a project with **View Project →** and a milestone with
**Inspect / Feedback** in the milestone table; a student opens a milestone with **View / Submit** on the
dashboard.

## 3. Data setup, run tag and cleanup

- The cloud database is shared and **persistent**; data you create stays. There is no reset button.
- To keep runs independent, every name you type contains a **run tag** `<RUN>` = your initials + a
  number, e.g. `PK1`. Use a new run tag if you repeat a case (milestone names must be unique per
  project).
- Cleanup: none needed. Sprint 1 has no delete feature by design (BR-07, BR-08); milestones created with
  a run tag are left as test data and do not affect other cases.
- **Sequence:** UAT-01 → UAT-04 must run in that order with the same `<RUN>` (UAT-04 continues
  UAT-01's milestone). UAT-02, UAT-03, UAT-05 and UAT-06 are independent and can run any time.

## 4. Case summary

| ID | Category (Lab 6 §3.1) | Requirement / AC | Role(s) |
|----|-----------------------|------------------|---------|
| UAT-01 | Normal domain journey | AC-04-01, AC-05-01, AC-05-09, AC-07-01, AC-07-02, AC-08-01 | SUP-A, STU-A1 |
| UAT-02 | Business rule / boundary | AC-04-02 (BR-03), AC-04-03 (BR-04) | SUP-A |
| UAT-03 | Forbidden role / ownership | AC-02-02, AC-02-04, AC-08-04 | SUP-B, STU-B1, STU-A1, SUP-A |
| UAT-04 | State / history / persistence | AC-05-02, AC-06-01, AC-06-07, AC-07-04, AC-05-10 (BR-20) | STU-A2, SUP-A, STU-A1 |
| UAT-05 | Business rule (cutoff) | AC-05-03 (BR-01), AC-07-05, AC-06-03 (BR-05) | STU-A1, SUP-A |
| UAT-06 | Invalid input (boundary) | AC-05-04 (NFR-08) | SUP-A, STU-A1 |

## 5. Cases

### UAT-01 — Supervisor creates a milestone and a student submits work (normal journey)

- **Purpose:** the main Sprint 1 flow works end to end in the UI.
- **Preconditions:** none (start logged out).
- **Inputs:** milestone name `UAT <RUN> Demo`; description `UAT milestone`; deadline = **3 days from
  today, 17:00**; submission title `UAT <RUN> Work`; link `https://github.com/example/uat-<RUN>`.

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Open the URL, sign in as **SUP-A** | Lands on "Assigned Projects"; one card "Course Project Management System" (Team: Team Alpha) |
| 2 | Click **View Project →** on that card | Project page with a milestone table (Milestone / Deadline / Status / Action) and a "Create Milestone" form |
| 3 | Fill the form with the inputs above, click **Create Milestone** | Message `Milestone "UAT <RUN> Demo" created successfully!`; the milestone appears in the table with the deadline you entered (ICT) and status **Open** |
| 4 | Logout, sign in as **STU-A1** | Student dashboard for "Course Project Management System" lists `UAT <RUN> Demo` with status **Open**; no percentage or score is shown anywhere |
| 5 | Click **View / Submit** on `UAT <RUN> Demo` | Page titled `UAT <RUN> Demo`, form "Submit Milestone Work" |
| 6 | Enter title and link from the inputs, click **Submit Work** | Saved without error; the section heading becomes "Current Submission" and the button becomes "Update Submission (Overwrite)" |
| 7 | Reload the page (F5) | Title and link are still shown exactly as entered |
| 8 | Go back to the dashboard | `UAT <RUN> Demo` now shows status **Submitted** |

### UAT-02 — Milestone deadline and name rules (business rule / boundary)

- **Purpose:** a supervisor cannot create a milestone in the past or a duplicate name in the same project.
- **Preconditions:** none. Can run before or after UAT-01.
- **Inputs:** name `UAT <RUN> Rule`; deadline A = **yesterday, 09:00**; deadline B = 3 days from today 17:00.

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Sign in as **SUP-A**, open "Course Project Management System" | Project page with Create Milestone form |
| 2 | Name `UAT <RUN> Rule`, deadline A, click **Create Milestone** | Red error `Milestone deadline must be in the future`; no row `UAT <RUN> Rule` in the table |
| 3 | Reload the page | Still no `UAT <RUN> Rule` row (nothing was saved) |
| 4 | Same name, deadline B, click **Create Milestone** | Success message; one row `UAT <RUN> Rule`, status **Open** |
| 5 | Again name `UAT <RUN> Rule`, deadline B, click **Create Milestone** | Red error `A milestone with this name already exists in this project` |
| 6 | Reload the page | Exactly **one** row named `UAT <RUN> Rule` |

### UAT-03 — Users cannot see another team's data (forbidden role / ownership)

- **Purpose:** students and supervisors only see projects/milestones they belong to; a Team Beta
  submission is not disclosed to Team Alpha and is not changed.
- **Preconditions:** none (the case creates its own Team Beta data). Needs two browser windows (W1, W2),
  e.g. one normal and one private window.
- **Inputs:** milestone `UAT <RUN> Beta`, deadline = 3 days from today 17:00; submission title
  `UAT <RUN> Beta Work`, link `https://github.com/example/beta-<RUN>`.
- **Note:** the blue app title "Course Project Management System (CPMS)" in the top bar is on every page;
  it is not a project card.

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | W1: sign in as **SUP-B**; check the project cards; click **View Project →** on "Smart Campus Transit"; create milestone `UAT <RUN> Beta` | Exactly one project card, "Smart Campus Transit" (Team: Team Beta) — no Team Alpha project. Milestone created with status **Open** |
| 2 | W1: Logout, sign in as **STU-B1**, open `UAT <RUN> Beta`, submit the title and link above; **copy the page URL** (`…/milestones/<id>`) | "Current Submission" shown with the entered values |
| 3 | W2: sign in as **STU-A1**, paste the URL from step 2 | Red message `Milestone not found` and a "Back to Dashboard" button only; the name `UAT <RUN> Beta`, the title and the link are **not** shown |
| 4 | W2: open the dashboard | `UAT <RUN> Beta` is not listed |
| 5 | W2: Logout, sign in as **SUP-A**, click **View Project →** on "Course Project Management System"; **copy the page URL** (`…/projects/<id>`) | Team Alpha project page with its milestone table |
| 6 | W1: Logout, sign in as **SUP-B**, paste the URL from step 5 | `Project not found`; no Team Alpha milestone (e.g. "Sprint 0 Proposal") is shown |
| 7 | W1: Logout, sign in as **STU-B1**, reopen the URL from step 2, then the dashboard | Title still `UAT <RUN> Beta Work`; status **Submitted** (nothing changed by the other users) |

### UAT-04 — Overwrite, feedback, frozen submission, persistence (state / history)

- **Purpose:** status changes are derived correctly, feedback is visible to the team, and a submission
  is frozen once feedback exists; data survives logout.
- **Preconditions:** UAT-01 completed with the same `<RUN>` (milestone `UAT <RUN> Demo` is **Submitted**).
- **Inputs:** new title `UAT <RUN> Work v2`; feedback text `UAT <RUN> feedback: approved`.

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Sign in as **STU-A2** (Bob), open `UAT <RUN> Demo` | Shows Alice's submission `UAT <RUN> Work` |
| 2 | Change title to `UAT <RUN> Work v2`, click **Update Submission (Overwrite)** | Saved; title now `UAT <RUN> Work v2`; status still **Submitted** (one submission per team, overwritten) |
| 3 | Logout, sign in as **SUP-A**, open the project, open `UAT <RUN> Demo` | Supervisor sees submission title `UAT <RUN> Work v2` and the link from UAT-01 |
| 4 | Enter the feedback text, click **Record Feedback (Final)** | Feedback shown with "Recorded at" time (ICT); the feedback form is gone |
| 5 | Back to the project page | `UAT <RUN> Demo` status **Completed** |
| 6 | Logout, sign in as **STU-A1**, open `UAT <RUN> Demo` | "Supervisor Feedback" shows `UAT <RUN> feedback: approved`; message "Submission is frozen because supervisor feedback has already been recorded."; form fields disabled, no submit button |
| 7 | Logout and sign in again as **STU-A1**, open the dashboard | `UAT <RUN> Demo` still **Completed**; submission title still `UAT <RUN> Work v2` |

### UAT-05 — Submission cutoff and missed milestone (business rule)

- **Purpose:** no submission after the deadline; a supervisor cannot give feedback without a submission.
- **Preconditions:** seeded milestone **"Sprint 0 Proposal"** (Team Alpha, deadline in the past, no
  submission).

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Sign in as **STU-A1**; on the dashboard find "Sprint 0 Proposal" | Status **Missed** |
| 2 | Open it | Message "The deadline for this milestone has passed. Submissions are no longer accepted (Cutoff passed)."; fields disabled; no submit button |
| 3 | Logout, sign in as **SUP-A**, open the project, open "Sprint 0 Proposal" | Message "This milestone has passed its deadline with no submission (Missed)."; no way to record feedback |
| 4 | Back to the project page | "Sprint 0 Proposal" still **Missed** |

### UAT-06 — Submission rejects a blank title and a non-http(s) link (invalid input)

- **Purpose:** a submission with an empty title or a non-web link is rejected and nothing is saved.
- **Preconditions:** none.
- **Inputs:** milestone `UAT <RUN> Input`, deadline = 3 days from today 17:00; link A =
  `https://github.com/example/input-<RUN>`; link B = `ftp://example.com/input-<RUN>`.
- **Known defect:** on revision `s87d9c6b4-00008-8lw` step 3 is expected to FAIL — see Issue #34
  (found by the Product Team). Please run it and record the actual result; it will be re-tested on the
  corrected release.

| # | Action | Expected result |
|---|--------|-----------------|
| 1 | Sign in as **SUP-A**, open "Course Project Management System", create milestone `UAT <RUN> Input` | Created, status **Open** |
| 2 | Logout, sign in as **STU-A1**, open `UAT <RUN> Input`, leave Submission Title **empty**, link A, click **Submit Work** | The browser blocks the form ("Please fill out this field"); nothing is sent |
| 3 | Type **three spaces** as the title, link A, click **Submit Work** | A red error message is shown; the heading stays "Submit Milestone Work" |
| 4 | Title `UAT <RUN> Input`, link B, click **Submit Work** | Rejected: the browser or a red error message refuses the link; nothing saved |
| 5 | Reload the page, then open the dashboard | No current submission; `UAT <RUN> Input` still **Open** |
| 6 | Title `UAT <RUN> Input`, link A, click **Submit Work** | Saved; "Current Submission" shows the title; status **Submitted** |

## 6. Product Team dry run (not the independent UAT)

Before handoff our team ran every case above on the release in §1 (revision `s87d9c6b4-00008-8lw`) with
run tag `DRY1` on 2026-11-25, using an automated Playwright browser script that clicks the same steps.
Result: all 32 steps behaved as expected (two steps were first flagged by a script selector bug and were
confirmed correct from their screenshots `UAT-01-s03.png` and `UAT-02-s04.png`). The dry run found one problem in this document (the first UAT-03 draft
needed an existing Team Beta milestone, but Team Beta had none) and UAT-03 was rewritten to create its own
data. Screenshots: `docs/labs/lab-06/evidence/dry-run/`. This is our own check, not the independent UAT.
The dry run of UAT-01 to UAT-05 found no defect.

**Defect found after the dry run.** On 2026-11-26, while reviewing the validation code, our team found
that a whitespace-only submission title is accepted and saved as an empty title, which violates AC-05-04.
It was confirmed on the live app (revision `s87d9c6b4-00008-8lw`) and reported as **Issue #34**
(Major). UAT-06 was added to cover invalid input. Evidence: `docs/labs/lab-06/evidence/defect-blank-title/`.
This finding was made by the Product Team, not by the independent UAT team.

Data left by our checks: milestones `UAT DRY1 Demo` (Completed), `UAT DRY1 Beta` (Submitted) and
`UAT DRY1 Rule` (Submitted, with the empty-title submission from Issue #34). Do not reuse the run tag
`DRY1`.

## 7. How to report a finding

Open a GitHub Issue in the repository above (title starts with the case ID, e.g. `[UAT-03] …`) with:
tested version/revision, case ID + step, preconditions, steps, expected, actual, severity
(Critical / Major / Minor) with the user impact, and a screenshot. Then tell us in the team chat.
We will notify you **before** deploying any change and give you the new revision for retest.
