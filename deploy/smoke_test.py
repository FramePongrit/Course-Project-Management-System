"""Read-only checks against the live CPMS service. Credentials are never printed.

Usage (called by .github/workflows/deploy.yml after every deploy):
    python3 deploy/smoke_test.py SERVICE_URL

Exits non-zero (failing the workflow) if any check fails. Each public check is
retried up to 5 times, 3 seconds apart, to tolerate Cloud Run cold starts.

Checks (adapted from the Lab 5 starter kit for CPMS):
  1. GET /api/health -> {"status": "ok"}                 process is up
  2. GET /api/ready  -> {"status": "ready"}              database reachable
  3. GET /           -> HTML page                        built React SPA is served
  4. GET /api/me     -> 401 without a session            API routing + auth guard
  5. OPTIONAL login  -> POST /api/auth/login, GET /api/me with the session cookie,
     POST /api/auth/logout. Runs only if BOTH SMOKE_EMAIL and SMOKE_PASSWORD are
     set (use a demo account, never a real one). Always logs out.

Standard library only. Offline tests: deploy/tests/test_smoke.py
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request


def request(base, path, data=None, cookie=None):
    """Return (status, headers, body). HTTP error statuses are returned, not raised."""
    headers = {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    if cookie:
        headers['Cookie'] = cookie
    req = urllib.request.Request(
        base + path,
        headers=headers,
        data=json.dumps(data).encode() if data is not None else None,
        method='POST' if data is not None else 'GET',
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as err:
        return err.code, err.headers, err.read()


def _json(body):
    return json.loads(body)


PUBLIC_CHECKS = (
    ('/api/health', lambda s, b: s == 200 and _json(b).get('status') == 'ok'),
    ('/api/ready', lambda s, b: s == 200 and _json(b).get('status') == 'ready'),
    ('/', lambda s, b: s == 200 and b'<html' in b.lower()),
    ('/api/me', lambda s, b: s == 401),
)


def session_cookie(headers):
    """Extract 'session=<value>' from Set-Cookie headers (value is never printed)."""
    for header in headers.get_all('Set-Cookie') or []:
        first = header.split(';', 1)[0].strip()
        if first.startswith('session='):
            return first
    return None


def check(base):
    for path, predicate in PUBLIC_CHECKS:
        for attempt in range(5):
            try:
                status, _headers, body = request(base, path)
                if not predicate(status, body):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)
        print('PASS ' + path)

    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return
    cookie = None
    try:
        status, headers, _body = request(base, '/api/auth/login', {'email': email, 'password': password})
        cookie = session_cookie(headers) if status == 200 else None
        if not cookie:
            raise ValueError('Login failed')
        status, _headers, body = request(base, '/api/me', cookie=cookie)
        if status != 200 or _json(body).get('email', '').lower() != email.lower():
            raise ValueError('Session not accepted')
        print('PASS login and authenticated /api/me')
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        if cookie:
            request(base, '/api/auth/logout', data={}, cookie=cookie)
            print('PASS logout')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    check(sys.argv[1].rstrip('/'))
