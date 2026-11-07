# Course Project Management

This context covers the course-supervision workflow through which student teams submit milestone work and receive feedback from their assigned supervisors.

## Course scope

**Course offering**:
The single course-and-semester instance containing multiple Projects. The product supports **exactly one** Course offering in all sprints; creating, switching, or administering multiple offerings is out of scope. Multi-course tenancy is recorded only as a possible future direction (see SRS §3), not built in this product.
_Avoid_: Course catalog, multi-course workspace

## People and ownership

**User account**:
The email-identified login identity of exactly one Student or Supervisor. Email addresses are unique, and a User account has exactly one role. Sprint 1 accounts are seeded; Sprint 2 Student accounts may be activated through a Supervisor Invitation.
_Avoid_: Multi-role account, profile

**Student**:
A named user with a unique student ID who belongs to a Team and may submit that Team's milestone work. The Student's email identifies their User account; a Student is not a system administrator.
_Avoid_: Learner, submitter

**Supervisor**:
A named user assigned to supervise particular Teams and who may create milestones and record feedback only for those Teams. The Supervisor's email identifies their User account; Supervisor accounts are provisioned externally through system setup and cannot be self-registered or invited by Students. Each Team has exactly one assigned Supervisor.
_Avoid_: Teacher, instructor, reviewer

**Team**:
A uniquely named group of Students that owns exactly one Project in the Course offering and has exactly one assigned Supervisor. Team names are unique within the Course offering. Sprint 2 allows a Supervisor to create a Team, which is automatically assigned to that Supervisor.
_Avoid_: Project group, class group

**Membership**:
The association between a Student and exactly one Team. Sprint 1 Memberships are seeded; Sprint 2 creates Membership when a Student accepts a Supervisor Invitation to an assigned Team. Membership becomes immutable after the Team's first Submission; before then, a removed Student no longer belongs to that Team.
_Avoid_: Enrollment, assignment

**Invitation**:
A single-use request from a Supervisor to one email address under the configured university domain to activate a Student account and join one assigned Team. It expires after 48 hours; revocation or replacement invalidates the previous token. An existing Student without a Team accepts it through their current account; an email already associated with a Team cannot be invited, and duplicate accounts are never created. It is the only self-service account activation path and is not public registration.
_Avoid_: Registration, open signup

## Delivery work

**Project**:
The named and briefly described course work owned by exactly one Team and supervised through that Team's assigned Supervisor. It is visible only to the owning Team's members and assigned Supervisor. A Course offering contains multiple Projects, while each Team owns exactly one Project. Sprint 1 Projects are seeded with their Teams; Sprint 2 allows a Supervisor to create a Project together with a new assigned Team.
_Avoid_: Team, repository

**Milestone**:
A named, described, deadline-bound piece of expected work that a Supervisor creates for exactly one supervised Project. Its name is unique within that Project. It is visible only to the owning Team's members and assigned Supervisor. Its deadline is in the future at creation, is expressed and evaluated in Asia/Bangkok (ICT), and is the cutoff for creating or changing that Team's Submission. Sprint 1 Milestones are immutable after creation; Sprint 3 permits editing or deletion only until the first Submission exists (moved from Sprint 2 — see decision D-08). Milestones are not shared across Projects.
_Avoid_: Title, assignment, task

**Submission**:
A persisted submission title, description, and HTTP(S) link owned by a Team for one Milestone. It is visible to the owning Team's members and read-only to the assigned Supervisor, including before the deadline. Any member of the owning Team may submit or overwrite the same record before the Submission cutoff and before any Feedback has been recorded; once Feedback exists for the Milestone the Submission is frozen and overwrite is rejected (see decision D-09). The record cannot be deleted. The system identifies who first submitted and who most recently updated it, and the most recent successful save is the current Submission. A Team has at most one current Submission per Milestone. Sprint 1 does not detect concurrent edit conflicts, accept file uploads, or retain revision history.
_Avoid_: File upload, deliverable

**Submission revision**:
An immutable numbered snapshot created each time a Team submits or resubmits title, description, and link in Sprint 2. The newest Revision is the current Submission; older Revisions remain read-only with their author and submission time.
_Avoid_: Overwrite, draft

**Submission cutoff**:
The rule that the server rejects creation or modification of a Submission when the current time is equal to or later than its Milestone deadline.
_Avoid_: Late-submission allowance

**Missed Milestone**:
A Milestone whose deadline has passed without a Submission. It cannot receive a late Submission or Feedback in Sprint 1.
_Avoid_: Late submission, overdue submission

**Milestone status**:
A system-derived progress state: Open when no Submission exists and the deadline has not passed; Submitted when a Submission exists, no Feedback exists, and the deadline has not passed; Awaiting Feedback when a Submission exists, no Feedback exists, and the deadline has passed; Completed once Feedback exists (which may be recorded before or after the deadline); or Missed when the deadline has passed and no Submission exists. Users do not set this state directly.
_Avoid_: User-selected status, workflow state

**Progress**:
The collection of a Project's Milestones and their derived statuses. Sprint 1 shows this per Project without an overall percentage, weight, or score. Sprint 3 lets a Supervisor view and filter a board across assigned Projects by Project, Team, and Milestone status; Students remain limited to their own Project, and no global cross-Supervisor board exists.
_Avoid_: Completion percentage, grade

**Feedback**:
A single immutable text response recorded by the assigned Supervisor once a Submission exists for the Milestone. It may be recorded before or after the deadline, is associated with the current Submission (its latest revision at the time of recording), is visible to every member of the owning Team and that Team's assigned Supervisor only, and does not include a score. Once recorded it cannot be edited or removed. Sprint 1 does not support formative feedback, multiple feedback entries, or feedback history.
_Avoid_: Comment, grade
