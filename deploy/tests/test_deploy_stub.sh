#!/usr/bin/env bash
# Offline test for deploy/deploy.sh: fake gcloud/docker/git on PATH, no GCP access, no cost.
# Run (repo root):  bash deploy/tests/test_deploy_stub.sh   (CI runs it too)
#
# Checks: dry run makes no calls; a real run builds -> migrates -> updates the service with
# CPMS settings (port 8080, JWT secret, COOKIE_SECURE=true); --demo adds the non-destructive
# seed; a failed migration, a missing secret or a non-main branch never touch the service;
# the script never creates infrastructure, IAM or secret values.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
export CALL_LOG="$T/calls"
export PATH="$T:$PATH"
fail() { echo "FAIL: $*" >&2; exit 1; }

cat > "$T/gcloud" <<'STUB'
#!/usr/bin/env bash
echo "gcloud $*" >> "$CALL_LOG"
case "$*" in
  'secrets versions describe latest --secret '*) [[ "${STUB_MODE:-}" != missing-secret ]] || exit 1 ;;
  'artifacts docker images describe '*)
    echo 'asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s87d9c6b4/s87d9c6b4@sha256:abc123' ;;
  'run jobs execute '*) [[ "${STUB_MODE:-}" != job-fail ]] || exit 1 ;;
  'run services describe '*'--format='*) echo 'https://s87d9c6b4-stub-as.a.run.app' ;;
esac
exit 0
STUB
cat > "$T/docker" <<'STUB'
#!/usr/bin/env bash
echo "docker $*" >> "$CALL_LOG"
STUB
cat > "$T/git" <<'STUB'
#!/usr/bin/env bash
case "$*" in
  'rev-parse HEAD') echo 2222222222222222222222222222222222222222 ;;
  'branch --show-current') echo "${STUB_BRANCH:-main}" ;;
  *) exit 1 ;;
esac
STUB
chmod +x "$T/gcloud" "$T/docker" "$T/git"

run() { : > "$CALL_LOG"; (cd "$ROOT" && bash deploy/deploy.sh "$@") > "$T/out" 2>&1; }

# 1. Dry run: no gcloud/docker calls at all.
DRY_RUN=1 run --demo || fail "dry run exited non-zero"
[ ! -s "$CALL_LOG" ] || fail "dry run called gcloud/docker"
grep -q -- '--port 8080' "$T/out" || fail "dry run does not use port 8080"
echo 'PASS dry run makes no gcloud/docker calls'

# 2. Real run without --demo: migrate only, service gets CPMS settings.
DRY_RUN=0 run || { cat "$T/out"; fail "real run exited non-zero"; }
grep -q '^docker build .*s87d9c6b4/s87d9c6b4:2222222222222222222222222222222222222222 ' "$CALL_LOG" || fail "image not tagged with full commit SHA"
job_line="$(grep '^gcloud run jobs update ' "$CALL_LOG")"
[[ "$job_line" == *'@sha256:abc123'* ]] || fail "job not pinned by digest"
[[ "$job_line" == *'-c,npx prisma migrate deploy --max-retries'* ]] || fail "job command is not plain migrate without --demo"
[[ "$job_line" != *DEMO_USER_PASSWORD* ]] || fail "demo secret mounted without --demo"
svc_line="$(grep '^gcloud run services update s87d9c6b4 ' "$CALL_LOG")"
for want in '--port 8080' 'JWT_SECRET=s87d9c6b4-app-secret-1:latest' 'DATABASE_URL=s87d9c6b4-database-url:latest' 'COOKIE_SECURE=true' 'NODE_ENV=production' '@sha256:abc123'; do
  [[ "$svc_line" == *"$want"* ]] || fail "service update missing: $want"
done
exec_line="$(grep -n '^gcloud run jobs execute ' "$CALL_LOG" | cut -d: -f1)"
svc_line_no="$(grep -n '^gcloud run services update s87d9c6b4 ' "$CALL_LOG" | cut -d: -f1)"
[ "$exec_line" -lt "$svc_line_no" ] || fail "service updated before migration"
echo 'PASS real run: SHA tag, digest, migrate before service, CPMS service settings'

# 3. --demo: non-destructive seed + demo secret; never SEED_RESET.
DRY_RUN=0 run --demo || fail "demo run exited non-zero"
job_line="$(grep '^gcloud run jobs update ' "$CALL_LOG")"
[[ "$job_line" == *'npx prisma migrate deploy && npm run prisma:seed'* ]] || fail "--demo does not seed"
[[ "$job_line" == *'DEMO_USER_PASSWORD=s87d9c6b4-demo-password:latest'* ]] || fail "--demo does not mount demo secret"
grep -q 'SEED_RESET' "$CALL_LOG" && fail "SEED_RESET must never be set in the cloud"
echo 'PASS --demo seeds with the demo secret and never resets'

# 4. Failed migration: service untouched.
if STUB_MODE=job-fail DRY_RUN=0 run; then fail "job failure not reported"; fi
grep -q '^gcloud run services update ' "$CALL_LOG" && fail "service updated after migration failure"
echo 'PASS failed migration blocks the service update'

# 5. Missing secret value: stop before building anything.
if STUB_MODE=missing-secret DRY_RUN=0 run; then fail "missing secret not reported"; fi
grep -q '^docker ' "$CALL_LOG" && fail "built after a missing secret"
echo 'PASS missing secret stops before build'

# 6. Not on main: refuse before any call.
if STUB_BRANCH=sprint-01 DRY_RUN=0 run; then fail "deployed from a non-main branch"; fi
[ ! -s "$CALL_LOG" ] || fail "calls made from a non-main branch"
echo 'PASS only main can be deployed'

# 7. Never creates infrastructure, IAM or secret values (portal/TA own them).
DRY_RUN=0 run --demo
if grep -Eq '^gcloud (.* )?(create|add-iam-policy-binding|set-iam-policy|versions add|delete)( |$)' "$CALL_LOG"; then
  fail "script creates/deletes resources, IAM or secret values"
fi
echo 'PASS no infrastructure, IAM or secret writes'
