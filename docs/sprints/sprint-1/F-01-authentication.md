# F-01 — Authentication
**Sprint 1** · Realizes FR-01, FR-02, FR-03, BR-14, BR-15 · Depends on: schema/seed (F-03)
Design basis: [ADR-0004](../../adr/0004-authentication-and-session.md), [`system-sds.md`](../../system-sds.md) §6

## 1. Feature SDS

### Behavior & workflow
A single login endpoint accepts an email and password. On success the server issues a JWT in an httpOnly
cookie and returns the user. A logged-in client reads its identity from `GET /api/me`; the auth middleware
verifies the cookie and loads the user from the DB on every request. Logout clears the cookie.

- **Login:** validate body → look up User by email → reject if no password hash (INVITED) or status ≠ ACTIVE → `bcrypt.compare` → on match set cookie + return user; on any failure return a **generic** 401 (do not reveal whether the email exists).
- **Current user:** middleware attaches `req.user`; `/me` returns its projection.
- **Logout:** clear the session cookie (Max-Age=0).

### Business rules / validation
- BR-14 email unique, one role per account (schema).
- BR-15 password stored only as bcrypt hash; INVITED/null-hash account cannot log in.
- NFR-03 bcrypt cost ≥ 10; never log plaintext.
- Email normalized to lower-case before lookup; body validated (email format, password non-empty).

### Permissions
- `POST /auth/login` is the only endpoint reachable while anonymous.
- `GET /me`, `POST /auth/logout` require a valid session.

### Dependencies
Seeded ACTIVE accounts (F-03). Used by every other feature via F-02.

## 2. UI / API / data spec

### API
| Method | Path | Body | Success | Errors |
|--------|------|------|---------|--------|
| POST | `/api/auth/login` | `{ email, password }` | `200 { id, name, email, role }` + `Set-Cookie` session | `422 VALIDATION` (bad body); `401 UNAUTHENTICATED` (bad credentials / INVITED / inactive) |
| GET | `/api/me` | — | `200 { id, name, email, role, teamId?, projectId? }` | `401 UNAUTHENTICATED` |
| POST | `/api/auth/logout` | — | `204` + cookie cleared | `401` if no session |

Cookie: `httpOnly; SameSite=Lax; Secure(prod); Path=/; Max-Age≈8h`. JWT claims `{ sub, role, exp }`.

### UI
- Login screen: email + password fields, submit, inline error on 401 ("Invalid email or password" — generic), loading state. On success redirect by role (Student → dashboard, Supervisor → projects).
- A logout control in the app header.

### Data
No new tables; uses `User` (`email`, `passwordHash`, `role`, `status`). No migration beyond M1.

## 3. Acceptance Criteria

| AC | Given / When | Then |
|----|--------------|------|
| **AC-01-01** | a seeded ACTIVE user with correct email+password logs in | 200 with the user; a session cookie is set |
| **AC-01-02** | correct email, wrong password | 401, generic message, no cookie |
| **AC-01-03** | unknown email | 401, generic message (does not reveal non-existence) |
| **AC-01-04** | a request with a valid session cookie to `/me` | 200 with the current user derived from the cookie |
| **AC-01-05** | a request to `/me` with no/invalid cookie | 401, no user data |
| **AC-01-06** | a logged-in user logs out, then calls a protected endpoint with the cleared cookie | logout 204; subsequent protected call 401 |
| **AC-01-07** | an INVITED account (null password hash) attempts login | 401; cannot log in (BR-15) |
| **AC-01-08** | the password column for a seeded user is inspected | it is a bcrypt hash, not plaintext (BR-15, NFR-03) |
| **AC-01-09** | a second account with an already-used email is attempted (BR-14) | the DB unique constraint rejects it; email is unique and each account has exactly one role |

## 4. Software Test Specification

| Test | AC | Level | Precondition / input | Action | Expected |
|------|----|-------|----------------------|--------|----------|
| TEST-01-01 | AC-01-01 | API | seeded ACTIVE student | POST /auth/login correct | 200 + Set-Cookie; body = user |
| TEST-01-02 | AC-01-02 | API | seeded user | POST login wrong password | 401, no cookie |
| TEST-01-03 | AC-01-03 | API | — | POST login unknown email | 401, generic |
| TEST-01-04 | AC-01-04 | API | logged-in cookie | GET /me | 200 = current user |
| TEST-01-05 | AC-01-05 | API | no cookie | GET /me | 401 |
| TEST-01-06 | AC-01-06 | API | logged-in cookie | POST /logout then GET /me | 204 then 401 |
| TEST-01-07 | AC-01-07 | API | seeded INVITED account | POST login | 401 |
| TEST-01-08 | AC-01-09 | API/DB | existing email | attempt to create second user with same email | DB unique violation (constraint holds) |
| TEST-01-09 | AC-01-08/NFR-03 | Unit | hash a known password | assert `bcrypt.compare` true and stored value ≠ plaintext, cost ≥ 10 | passes |

## 5. Definition of Done
Product DoD (sprint README) + : generic 401 verified (no user-enumeration), cookie flags asserted, hashing
unit test green, `/me` drives UI role rendering. TDD red→green kept for AC-01-07.

---
### Revision history
| Version | Date (ICT) | Author | Change |
|---------|-----------|--------|--------|
| 0.1 | 2026-11-07 | team | Initial contract. |
| 0.2 | 2026-11-07 | team | Added AC-01-09 (unique email/one role) and mapped TEST-01-08 to it. |
