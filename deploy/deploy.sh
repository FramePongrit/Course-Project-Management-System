#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# CPMS — manual first deployment to the course's shared Google Cloud project
# ==============================================================================
# Based on the course portal's Lab 5 kit for team s87d9c6b4 (shared project
# cpe-se-course-2026). The portal/TA already created Cloud SQL, Artifact Registry,
# secrets, the runtime service account, the migration job and the Cloud Run
# service. This script only builds the image and UPDATES the job and the service.
# It never creates infrastructure or IAM; never add those steps back.
#
# Usage (Cloud Shell, repo root, on an up-to-date `main`):
#   DRY_RUN=1 bash deploy/deploy.sh --demo     # preview: prints commands, no gcloud calls
#   DRY_RUN=0 bash deploy/deploy.sh --demo     # real run
#
#   --demo  also seeds the demo accounts (Lab 6 UAT). Their password comes from the
#           Secret Manager secret ${SECRET_DEMO_PASS}; the seed is non-destructive
#           (skips when users exist), so re-running is safe.
#
# Before the first real run, put a value in the JWT secret slot (once):
#   openssl rand -hex 48 | gcloud secrets versions add s87d9c6b4-app-secret-1 \
#     --data-file=- --project cpe-se-course-2026
#   (or ./kit.sh secrets add 1 from the portal's Project Kit). Never print it.
#
# Routine releases afterwards: .github/workflows/deploy.yml -> deploy/release.sh
# (reuses the job command and service settings set here, swaps only the image).
# Offline test: deploy/tests/test_deploy_stub.sh
# ==============================================================================

# ------------------------------------------------------------------------------
# Settings & argument parsing
# ------------------------------------------------------------------------------
DRY_RUN="${DRY_RUN:-1}"
SEED_DEMO_DATA="false"

for arg in "$@"; do
  case "$arg" in
    --demo)
      SEED_DEMO_DATA="true"
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--demo]" >&2
      exit 1
      ;;
  esac
done

# Prints the command (DRY_RUN=1) or prints then executes it.
run_cmd() {
  local arg
  if [ "$DRY_RUN" = "1" ]; then
    printf '[DRY_RUN] '
  else
    printf '+ '
  fi
  for arg in "$@"; do
    case "$arg" in
      --password=*) printf '%s ' '--password=<REDACTED>' ;;
      *) printf '%q ' "$arg" ;;
    esac
  done
  printf '\n'
  if [ "$DRY_RUN" != "1" ]; then
    "$@"
  fi
}

# Shared course project and team resources (assigned by the portal; do not change).
PROJECT_ID="${PROJECT_ID:-cpe-se-course-2026}"
[[ "$PROJECT_ID" == "cpe-se-course-2026" ]] || { echo 'Wrong course project' >&2; exit 1; }
REGION="${REGION:-asia-southeast1}"
[[ "$REGION" == "asia-southeast1" ]] || { echo 'Wrong assigned region' >&2; exit 1; }
REPO_NAME="s87d9c6b4"
SQL_INSTANCE="s87d9c6b4-pg"
SERVICE_NAME="s87d9c6b4"
MIGRATE_JOB_NAME="s87d9c6b4-migrate"
SA_NAME="s87d9c6b4-runner"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SQL_CONN_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
if [ "$DRY_RUN" = "1" ]; then
  IMAGE_TAG="${IMAGE_TAG:-0000000000000000000000000000000000000000}"
else
  IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse HEAD)}"
  [[ "$(git branch --show-current)" == "main" ]] || { echo 'Deploy reviewed main only' >&2; exit 1; }
  [[ "$IMAGE_TAG" == "$(git rev-parse HEAD)" ]] || { echo 'IMAGE_TAG must match HEAD' >&2; exit 1; }
fi
[[ "$IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]] || { echo 'Use full commit SHA' >&2; exit 1; }
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

# Secret Manager secret NAMES (values are never stored in this repo or printed).
SECRET_DB_URL="s87d9c6b4-database-url"      # made by the portal
SECRET_DEMO_PASS="s87d9c6b4-demo-password"  # made by the portal (demo seed only)
SECRET_JWT="s87d9c6b4-app-secret-1"         # team slot 1 = CPMS JWT_SECRET

# CPMS: the app listens on 8080 (Dockerfile ENV PORT=8080).
APP_PORT="8080"

# CPMS migration job command. Migrations always run; the demo seed only with --demo.
# The seed never wipes data (SEED_RESET is never set in the cloud).
MIGRATE_CMD="npx prisma migrate deploy"
JOB_SECRETS="DATABASE_URL=${SECRET_DB_URL}:latest"
if [ "$SEED_DEMO_DATA" = "true" ]; then
  MIGRATE_CMD="${MIGRATE_CMD} && npm run prisma:seed"
  JOB_SECRETS="${JOB_SECRETS},DEMO_USER_PASSWORD=${SECRET_DEMO_PASS}:latest"
fi

# Runtime settings of the service (non-secret values only).
SERVICE_ENV="NODE_ENV=production,TZ=Asia/Bangkok,COOKIE_SECURE=true,JWT_EXPIRES_IN=8h,UNIVERSITY_EMAIL_DOMAIN=student.university.ac.th"
SERVICE_SECRETS="DATABASE_URL=${SECRET_DB_URL}:latest,JWT_SECRET=${SECRET_JWT}:latest"

echo "=================================================================="
echo "CPMS Cloud Run Deployment"
echo "Project : ${PROJECT_ID}"
echo "Region  : ${REGION}"
echo "Service : ${SERVICE_NAME} (port ${APP_PORT})"
echo "Demo    : ${SEED_DEMO_DATA}"
echo "Dry Run : ${DRY_RUN}"
echo "=================================================================="

# ------------------------------------------------------------------------------
# Pre-flight: the portal-made resources must exist (describe only; never create).
# ------------------------------------------------------------------------------
if [ "$DRY_RUN" != "1" ]; then
  gcloud run services describe "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" >/dev/null
  gcloud run jobs describe "$MIGRATE_JOB_NAME" --project "$PROJECT_ID" --region "$REGION" >/dev/null
  required_secrets=("$SECRET_DB_URL" "$SECRET_JWT")
  if [ "$SEED_DEMO_DATA" = "true" ]; then required_secrets+=("$SECRET_DEMO_PASS"); fi
  for secret in "${required_secrets[@]}"; do
    if ! gcloud secrets versions describe latest --secret "$secret" --project "$PROJECT_ID" >/dev/null 2>&1; then
      echo "ERROR: secret '${secret}' has no readable version (no value yet, or no access). See the header of this script." >&2
      exit 1
    fi
  done
fi

# ------------------------------------------------------------------------------
# 1. Build & push the image (tag = full commit SHA), then pin it by digest
# ------------------------------------------------------------------------------
run_cmd gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
run_cmd docker build --platform linux/amd64 --tag "$IMAGE_URI" .
run_cmd docker push "$IMAGE_URI"
if [ "$DRY_RUN" != "1" ]; then
  IMAGE_URI="$(gcloud artifacts docker images describe "$IMAGE_URI" --project "$PROJECT_ID" --format='value(image_summary.fully_qualified_digest)')"
  [[ "$IMAGE_URI" == "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}@sha256:"* ]] || { echo 'Missing image digest' >&2; exit 1; }
fi

# ------------------------------------------------------------------------------
# 2. Update and run the migration job (prisma migrate deploy [+ demo seed])
#    If it fails the script stops BEFORE the service is updated.
# ------------------------------------------------------------------------------
run_cmd gcloud run jobs update "$MIGRATE_JOB_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --set-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "$JOB_SECRETS" \
  --set-env-vars "NODE_ENV=production,TZ=Asia/Bangkok" \
  --command "sh" \
  --args "-c,${MIGRATE_CMD}" \
  --max-retries 1 \
  --task-timeout 300s \
  --project "$PROJECT_ID"

if ! run_cmd gcloud run jobs execute "$MIGRATE_JOB_NAME" \
  --region "$REGION" \
  --wait \
  --project "$PROJECT_ID"; then
  printf '%s\n' "ERROR: Cloud Run migration job '${MIGRATE_JOB_NAME}' failed. Aborting service deployment." >&2
  printf '%s\n' "View job logs with:" >&2
  printf '%s\n' "  gcloud logging read \"resource.type=cloud_run_job AND resource.labels.job_name=${MIGRATE_JOB_NAME}\" --project \"${PROJECT_ID}\" --limit 50 --format=\"value(textPayload)\"" >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# 3. Update the Cloud Run service (public demo; scale to zero when idle)
# ------------------------------------------------------------------------------
run_cmd gcloud run services update "$SERVICE_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --add-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "$SERVICE_SECRETS" \
  --set-env-vars "$SERVICE_ENV" \
  --min-instances 0 \
  --max-instances 1 \
  --memory 512Mi \
  --cpu 1 \
  --port "$APP_PORT" \
  --project "$PROJECT_ID"

run_cmd gcloud run services update-traffic "$SERVICE_NAME" --to-latest --project "$PROJECT_ID" --region "$REGION" --quiet
if [ "$DRY_RUN" = "1" ]; then
  SERVICE_URL="https://${SERVICE_NAME}-<hash>-as.a.run.app"
else
  SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
fi

printf '\n'
printf '%s\n' "=================================================================="
printf '%s\n' "Deployment Completed!"
printf '%s\n' "Commit         : ${IMAGE_TAG}"
printf '%s\n' "Service URL    : ${SERVICE_URL}"
printf '%s\n' "Health Check   : ${SERVICE_URL}/api/health"
printf '%s\n' "Readiness Check: ${SERVICE_URL}/api/ready"
if [ "$SEED_DEMO_DATA" = "true" ]; then
  printf '%s\n' "Demo Password  : in Secret Manager ${SECRET_DEMO_PASS} (not printed)."
fi
printf '%s\n' "=================================================================="
