# Authentication and session: email/password with JWT in an httpOnly cookie

## Login identity
A User logs in with their unique **email and an application-specific password** through a single login
endpoint, regardless of role. The account's stored role (STUDENT or SUPERVISOR) determines what the
client renders and what the backend authorizes; there is no role selector and no separate login path per
role. A Student's `studentId` is an attribute, not a login credential.

## Credentials
Passwords are hashed with bcrypt; plaintext is never stored. Sprint 1 accounts are seeded with a known
synthetic demo password whose plaintext lives only in a gitignored local handoff, never in Git or the
submission PDF. A User row carries `passwordHash` (nullable) and `status` (ACTIVE | INVITED): an INVITED
account has no password and cannot log in until it is activated through a Supervisor Invitation in
Sprint 2 (`/activate?token=` → set password → ACTIVE). Sprint 1 seeds every account as ACTIVE, but the
`status` and nullable `passwordHash` fields exist from the start so Sprint 2 needs no migration.

## Session mechanism
On successful login the server issues a JWT (HS256, signed with `JWT_SECRET`) whose claims are the user id
(`sub`), role, and an expiry of ~8 hours. The token is placed in a cookie that is **httpOnly, SameSite=Lax,
Secure in production, Path=/**, so browser JavaScript cannot read it and XSS cannot exfiltrate it. We chose
JWT-in-cookie over a DB-backed session table (simpler, stateless, friendly to a horizontally scaled Cloud
Run deployment with no session store) and over a Bearer token in localStorage (which would be readable by
XSS).

## Request authorization
An auth middleware reads the cookie, verifies the signature and expiry, then **loads the user from the
database by `sub` on every request** and attaches the fresh role, status and team memberships to the
request. Authorization is always enforced on the backend from this server-derived identity, never from a
client-supplied user id or role. A request whose user is not ACTIVE is rejected. `GET /api/me` returns the
current user projection for the client to render.

## Student onboarding and credential scope
A Student never self-registers. The only way into the system is a Supervisor Invitation (Sprint 2): the
invited university-domain email becomes an INVITED account that is activated by setting a password at
`/activate?token=`, after which the Student logs in normally with email and password. A Student who already
has an ACTIVE account but no Team accepts a new invitation through that existing account, which only adds a
Membership and never creates a duplicate account or resets the password.

**Password recovery is an explicit product exclusion** in all sprints. If a Student forgets their password
there is no self-service or supervisor-assisted reset; this keeps engineering effort on the domain workflow.
The login design isolates the identity-proof step, so a real deployment could later replace the password
check with University SSO (OAuth/SAML), at which point password recovery stops being our concern, without
changing the invitation-based membership model or the JWT-cookie session and DB-derived authorization.

## Logout and known limitation
`POST /api/auth/logout` clears the cookie (Max-Age=0). Because the JWT is stateless, a copy of the token
remains technically valid until its ~8-hour expiry; there is no server-side denylist in Sprint 1. This is a
documented, accepted limitation mitigated by the short lifetime. If true immediate revocation becomes
required, the alternative is to move to opaque session tokens stored in Postgres.
