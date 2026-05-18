#!/usr/bin/env bash
#
# run_single.sh — Run a single k6 benchmark by name or number.
#
# Usage:
#   ./benchmarks/run_single.sh 01_auth_login           # by name
#   ./benchmarks/run_single.sh 3                        # by number (03)
#   ./benchmarks/run_single.sh 5 stress                 # with profile
#
# Environment variables (override as needed):
#   BASE_URL      Target URL (default http://localhost:80)
#   ADMIN_USER    Teacher username (default Teacher)
#   ADMIN_PASS    Teacher password (default teacherPassword)
#   BENCH_PREFIX  Username prefix for created users (default k6bench_)
#   BENCH_PASS    Password for created users (default BenchPass123!)
#   USERS_CSV     Path to a CSV file with pre-created users (columns:
#                 id,username,password). When set, user creation and
#                 deletion via docker exec are skipped entirely — ideal
#                 for running benchmarks against a remote cluster.
#
# Prerequisites:
#   - Docker Compose stack running (backend container reachable)
#     OR USERS_CSV set (no docker access required)
#   - k6 installed locally (https://k6.io/docs/get-started/installation/)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:?Usage: run_single.sh <benchmark> [profile]}"
PROFILE="${2:-smoke}"

BASE_URL="${BASE_URL:-http://localhost:80}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin}"
BENCH_PREFIX="${BENCH_PREFIX:-k6bench_}"
BENCH_PASS="${BENCH_PASS:-BenchPass123!}"

# Derive hostname from BASE_URL (strip scheme and path, keep host:port)
# e.g. http://localhost:80 -> localhost:80
#      http://myclassdev.instaclone.de -> myclassdev.instaclone.de
# Override BENCH_HOST explicitly if the Host header must differ from BASE_URL.
# e.g. BASE_URL=http://localhost:80 BENCH_HOST=myclassdev.instaclone.de ./run_single.sh 1
BENCH_HOST="${BENCH_HOST:-$(echo "$BASE_URL" | sed 's|^https\?://||' | cut -d'/' -f1)}"
echo "Using tenant host: ${BENCH_HOST}"

# ---------------------------------------------------------------------------
# Resolve target to a .js file path
# ---------------------------------------------------------------------------
shopt -s nullglob
FILE=""

if [[ "$TARGET" =~ ^[0-9]+$ ]]; then
  PADDED=$(printf "%02d" "$TARGET")
  matches=("${SCRIPT_DIR}/${PADDED}"_*.js)
  if [[ ${#matches[@]} -gt 0 ]]; then
    FILE="${matches[0]}"
  fi
else
  direct_file="${SCRIPT_DIR}/${TARGET}.js"
  if [[ -f "$direct_file" ]]; then
    FILE="$direct_file"
  else
    matches=("${SCRIPT_DIR}/"*"${TARGET}"*.js)
    if [[ ${#matches[@]} -gt 0 ]]; then
      FILE="${matches[0]}"
    fi
  fi
fi

if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "Error: Cannot find benchmark '${TARGET}'"
  echo ""
  echo "Available benchmarks:"
  available=("${SCRIPT_DIR}/"*.js)
  if [[ ${#available[@]} -eq 0 ]]; then
    echo "  (none found)"
  else
    for f in "${available[@]}"; do
      echo "  $(basename "$f" .js)"
    done
  fi
  exit 1
fi

shopt -u nullglob

NAME="$(basename "$FILE" .js)"

# ---------------------------------------------------------------------------
# Results directory — one folder per run, named by timestamp + profile
# ---------------------------------------------------------------------------
RESULTS_DIR="${SCRIPT_DIR}/results/$(date +%Y%m%d_%H%M%S)_${PROFILE}"
mkdir -p "$RESULTS_DIR"

# ---------------------------------------------------------------------------
# Determine user count from profile
# ---------------------------------------------------------------------------
case "$PROFILE" in
  smoke)    USER_COUNT=5 ;;
  baseline) USER_COUNT=50 ;;
  stress)   USER_COUNT=300 ;;
  *)        USER_COUNT=5 ;;
esac

# ---------------------------------------------------------------------------
# Detect backend container (skip when using USERS_CSV for remote runs)
# ---------------------------------------------------------------------------
if [[ -z "${USERS_CSV:-}" ]]; then
  CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | head -1)
  if [[ -z "${CONTAINER:-}" ]]; then
    echo "Error: No running container with 'backend' in its name."
    echo "Make sure the Docker Compose stack is up (docker compose up -d)."
    echo "Or set USERS_CSV to a CSV file with pre-created users for remote runs."
    exit 1
  fi
  echo "Using backend container: ${CONTAINER}"
else
  echo "Using pre-created users from CSV: ${USERS_CSV}"
fi
echo "Results directory: ${RESULTS_DIR}"

# ---------------------------------------------------------------------------
# Sysmetrics collector (runs in background alongside k6)
# ---------------------------------------------------------------------------
SYSMETRICS_FILE="${RESULTS_DIR}/${NAME}_sysmetrics.csv"
SYSMETRICS_PID=""

start_sysmetrics() {
  "${SCRIPT_DIR}/collect_sysmetrics.sh" "$SYSMETRICS_FILE" 1 &
  SYSMETRICS_PID=$!
  echo "Sysmetrics collector started (PID ${SYSMETRICS_PID}) → ${SYSMETRICS_FILE}"
}

stop_sysmetrics() {
  if [[ -n "${SYSMETRICS_PID:-}" ]]; then
    kill "$SYSMETRICS_PID" 2>/dev/null || true
    wait "$SYSMETRICS_PID" 2>/dev/null || true
    SYSMETRICS_PID=""
  fi
}

# Ensure collector is stopped even if the script exits unexpectedly
trap 'stop_sysmetrics' EXIT INT TERM

# ---------------------------------------------------------------------------
# Setup: load users from CSV or create via docker exec
# ---------------------------------------------------------------------------
TIMESTAMP=$(date +%s)
SKIP_TEARDOWN=false

if [[ -n "${USERS_CSV:-}" ]]; then
  # -- Remote mode: read pre-created users from CSV --------------------------
  if [[ ! -f "$USERS_CSV" ]]; then
    echo "Error: USERS_CSV file not found: ${USERS_CSV}"
    exit 1
  fi
  echo ""
  echo "Loading users from CSV: ${USERS_CSV}"
  USERS_JSON=$(python3 -c "
import csv, json, sys
with open('${USERS_CSV}') as f:
    reader = csv.DictReader(f)
    users = []
    for row in reader:
        users.append({'id': int(row['id']), 'username': row['username'], 'password': row['password']})
sys.stdout.write(json.dumps(users))
")
  USER_COUNT_ACTUAL=$(echo "$USERS_JSON" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
  echo "Loaded ${USER_COUNT_ACTUAL} users from CSV."
  SKIP_TEARDOWN=true
else
  # -- Local mode: create users via docker exec ------------------------------
  echo ""
  echo "Creating ${USER_COUNT} benchmark users (prefix: ${BENCH_PREFIX}${TIMESTAMP}_) ..."

  USERS_JSON=$(docker exec "$CONTAINER" python manage.py shell -c "
import json, sys
from django.db import connection
from tenants.models import Domain
from django.contrib.auth import get_user_model

hostname = '${BENCH_HOST}'
try:
    domain = Domain.objects.get(domain=hostname)
    schema = domain.tenant.schema_name
except Domain.DoesNotExist:
    available = list(Domain.objects.values_list('domain', flat=True))
    sys.stderr.write('ERROR: No tenant found for domain %r\n' % hostname)
    sys.stderr.write('Available domains: %s\n' % available)
    sys.stderr.write('Set BASE_URL to one of these hosts.\n')
    sys.exit(1)

connection.set_schema(schema)
User = get_user_model()
prefix = '${BENCH_PREFIX}${TIMESTAMP}_'
password = '${BENCH_PASS}'
users = []
for i in range(${USER_COUNT}):
    username = prefix + str(i)
    u = User.objects.create_user(username=username, password=password)
    users.append({'id': u.pk, 'username': username, 'password': password})
sys.stdout.write(json.dumps(users))
")

  USER_COUNT_ACTUAL=$(echo "$USERS_JSON" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
  echo "Created ${USER_COUNT_ACTUAL} users."
fi

# ---------------------------------------------------------------------------
# Run k6 (with sysmetrics collector running in background)
# ---------------------------------------------------------------------------
echo ""
echo "Running: ${NAME} (profile: ${PROFILE})"
echo ""

start_sysmetrics

cd "${SCRIPT_DIR}"
k6 run \
  -e "PROFILE=${PROFILE}" \
  -e "BASE_URL=${BASE_URL}" \
  -e "BENCH_HOST=${BENCH_HOST}" \
  -e "ADMIN_USER=${ADMIN_USER}" \
  -e "ADMIN_PASS=${ADMIN_PASS}" \
  -e "USERS_JSON=${USERS_JSON}" \
  --summary-export="${RESULTS_DIR}/${NAME}_summary.json" \
  -o "json=${RESULTS_DIR}/${NAME}_raw.json.gz" \
  "./$(basename "$FILE")" 2>&1 | tee "${RESULTS_DIR}/${NAME}.log" || true

K6_EXIT="${PIPESTATUS[0]}"

stop_sysmetrics

# ---------------------------------------------------------------------------
# Teardown: delete benchmark users via docker exec (skipped for CSV mode)
# ---------------------------------------------------------------------------
if [[ "$SKIP_TEARDOWN" == "false" ]]; then
  echo ""
  echo "Deleting benchmark users with prefix '${BENCH_PREFIX}${TIMESTAMP}_' ..."

  docker exec "$CONTAINER" python manage.py shell -c "
from django.db import connection
from tenants.models import Domain
from django.contrib.auth import get_user_model
domain = Domain.objects.get(domain='${BENCH_HOST}')
connection.set_schema(domain.tenant.schema_name)
User = get_user_model()
prefix = '${BENCH_PREFIX}${TIMESTAMP}_'
deleted, _ = User.objects.filter(username__startswith=prefix).delete()
print(f'Deleted {deleted} users')
"
else
  echo ""
  echo "Skipping user teardown (users were loaded from CSV)."
  echo "Use delete_remote_users.sh to clean up when done."
fi

exit $K6_EXIT
