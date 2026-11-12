# Part F Program Demonstration Screenshots

These are captured automatically by Playwright (no manual clicking). They provide the
Deliverable-1 §4.2 "Program demonstrations" evidence. Backend/API evidence for the
protected operations is additionally covered by the automated test excerpts and the
AC-to-test matrix in Part F.

## How to regenerate

Requires PostgreSQL running and demo data seeded (same prerequisites as `npm run dev`):

```bash
cp .env.example .env        # if not already
npm install
npx prisma migrate dev
npm run prisma:seed
npm run screenshots         # builds the client, runs tests/e2e/screenshots.spec.ts
```

PNG files are written to this folder (`docs/screenshots/`).

## What each file shows → which Part F scenario / AC

| File | Scenario | Shows | AC |
|------|----------|-------|----|
| `01-login.png` | 1 | Login screen (credentials entered) | F-01 |
| `02-student-dashboard.png` | 1 | Student project dashboard with milestone statuses | AC-08-01 |
| `03-milestone-submit-form.png` | 1 | Submission form before submitting (status Open) | AC-05-01 |
| `04-submission-saved.png` | 1 | Success message, status → Submitted | AC-05-01 |
| `05-submission-persisted-after-reload.png` | 1 | After reload: submission retrieved from DB | AC-05-09 |
| `06-supervisor-projects.png` | 1 | Supervisor's assigned projects list | FR-10 |
| `07-supervisor-project-detail.png` | 1 | Project milestones (supervisor view) | AC-08-02 |
| `08-supervisor-feedback-form.png` | 1 | Read-only submission + feedback form | AC-06-01 |
| `09-feedback-recorded-completed.png` | 1 | Feedback recorded, status → Completed | AC-06-01, AC-07-04 |
| `10-student-sees-feedback.png` | 1 | Student reloads: feedback visible, Completed (persisted) | AC-06-07 |
| `11-cutoff-rejection.png` | 2 | Past-deadline milestone: cutoff banner + disabled form | AC-05-03, BR-01 |
| `12-authz-cross-team-404.png` | 3 | Other team's student → 404, no data leak | AC-02-02, AC-05-06 |
| `13-authz-unauth-redirect-login.png` | 3 | Unauthenticated → redirected to login | AC-02-01, NFR-01 |

> Note on authorization: the UI shots above are complemented by server-side proof in the
> automated tests (403/404/401 asserted against the API), since "hiding a button does not
> prove authorization" (Deliverable 1 §4.2). See Part F §5 test excerpts and §4 matrix.
