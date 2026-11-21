#!/usr/bin/env bash
# Offline test for deploy/release.sh (fake gcloud, no GCP access, no cost).
# Adapted from the Lab 5 starter kit for the portal's names (image s87d9c6b4/s87d9c6b4).
# Run (repo root):  bash deploy/tests/test_release_stub.sh   (CI runs it too)
#   1. normal release : digest-pinned image, migration awaited, service updated, URL exported
#   2. rollback       : service updated, migration job NOT touched
#   3. image missing / migration fails : service NOT updated
#   4. invalid tag    : rejected before any gcloud call
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TASK_TMP="$(mktemp -d)"
trap 'rm -rf "$TASK_TMP"' EXIT
export PROJECT_ID=cpe-se-course-2026 REGION=asia-southeast1
export IMAGE_TAG=1111111111111111111111111111111111111111
export CALL_LOG="$TASK_TMP/calls" GITHUB_ENV="$TASK_TMP/env"
export PATH="$TASK_TMP:$PATH"
cat > "$TASK_TMP/gcloud" <<'STUB'
#!/usr/bin/env bash
echo "$*" >> "$CALL_LOG"
case "$*" in
  'artifacts docker images describe '*)
    [[ "${FAIL_AT:-}" != image ]] || exit 1
    echo 'asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s87d9c6b4/s87d9c6b4@sha256:abcdef' ;;
  'run jobs execute '*) [[ "${FAIL_AT:-}" != migration ]] || exit 1 ;;
  'run services describe '*) echo 'https://demo.example.test' ;;
esac
STUB
chmod +x "$TASK_TMP/gcloud"
export ROLLBACK=false
bash "$ROOT/deploy/release.sh"
grep -q 'artifacts docker images describe asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s87d9c6b4/s87d9c6b4:1111111111111111111111111111111111111111' "$CALL_LOG"
grep -q 'run jobs update s87d9c6b4-migrate .*@sha256:abcdef' "$CALL_LOG"
grep -q 'run jobs execute s87d9c6b4-migrate .*--wait' "$CALL_LOG"
grep -q 'run services update s87d9c6b4 .*@sha256:abcdef' "$CALL_LOG"
grep -q 'SERVICE_URL=https://demo.example.test' "$GITHUB_ENV"
echo 'PASS normal release uses digest and waits for migration'

: > "$CALL_LOG"
export ROLLBACK=true
bash "$ROOT/deploy/release.sh"
if grep -q 'run jobs' "$CALL_LOG"; then echo 'Rollback ran migration' >&2; exit 1; fi
grep -q 'run services update ' "$CALL_LOG"
echo 'PASS rollback reuses image without touching migration job'

for failure in image migration; do
  : > "$CALL_LOG"
  if ROLLBACK=false FAIL_AT="$failure" bash "$ROOT/deploy/release.sh"; then
    echo "Expected $failure failure" >&2; exit 1
  fi
  if grep -q 'run services update' "$CALL_LOG"; then
    echo "Service changed after $failure failure" >&2; exit 1
  fi
  echo "PASS $failure failure blocks service update"
done

: > "$CALL_LOG"
if IMAGE_TAG='invalid;tag' bash "$ROOT/deploy/release.sh"; then exit 1; fi
test ! -s "$CALL_LOG"
echo 'PASS invalid tag rejected before GCP calls'
