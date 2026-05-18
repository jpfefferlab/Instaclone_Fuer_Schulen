#!/usr/bin/env bash
#
# run_all.sh — Execute all k6 benchmarks sequentially.
#
# Usage:
#   ./benchmarks/run_all.sh                       # smoke (default)
#   ./benchmarks/run_all.sh baseline              # baseline load
#   ./benchmarks/run_all.sh stress                # stress test
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

PROFILE="${1:-smoke}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results/$(date +%Y%m%d_%H%M%S)_${PROFILE}"
mkdir -p "$RESULTS_DIR"

BASE_URL="${BASE_URL:-http://localhost:80}"
ADMIN_USER="${ADMIN_USER:-Teacher}"
ADMIN_PASS="${ADMIN_PASS:-teacherPassword}"
BENCH_PREFIX="${BENCH_PREFIX:-k6bench_}"
BENCH_PASS="${BENCH_PASS:-BenchPass123!}"

# Derive hostname from BASE_URL (override BENCH_HOST independently if needed)
# e.g. BASE_URL=http://localhost:80 BENCH_HOST=myclassdev.instaclone.de ./run_all.sh
BENCH_HOST="${BENCH_HOST:-$(echo "$BASE_URL" | sed 's|^https\?://||' | cut -d'/' -f1)}"

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
SKIP_USER_LIFECYCLE=false
if [[ -n "${USERS_CSV:-}" ]]; then
  if [[ ! -f "$USERS_CSV" ]]; then
    echo "Error: USERS_CSV file not found: ${USERS_CSV}"
    exit 1
  fi
  SKIP_USER_LIFECYCLE=true
  CONTAINER="(not used)"
  # Pre-load the JSON once for all benchmarks
  PRELOADED_USERS_JSON=$(python3 -c "
import csv, json, sys
with open('${USERS_CSV}') as f:
    reader = csv.DictReader(f)
    users = []
    for row in reader:
        users.append({'id': int(row['id']), 'username': row['username'], 'password': row['password']})
sys.stdout.write(json.dumps(users))
")
  echo "Loaded $(echo "$PRELOADED_USERS_JSON" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)))') users from CSV: ${USERS_CSV}"
else
  CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | head -1)
  if [[ -z "${CONTAINER:-}" ]]; then
    echo "Error: No running container with 'backend' in its name."
    echo "Make sure the Docker Compose stack is up (docker compose up -d)."
    echo "Or set USERS_CSV to a CSV file with pre-created users for remote runs."
    exit 1
  fi
fi

echo "=============================================="
echo " InstaClone k6 Benchmarks"
echo " Profile   : ${PROFILE}"
echo " Base URL  : ${BASE_URL}"
echo " Host      : ${BENCH_HOST}"
echo " Container : ${CONTAINER}"
echo " Results   : ${RESULTS_DIR}"
echo "=============================================="
echo ""

# ---------------------------------------------------------------------------
# Sysmetrics helpers (per-benchmark start/stop)
# ---------------------------------------------------------------------------
SYSMETRICS_PID=""

start_sysmetrics() {
  local csv_path="$1"
  "${SCRIPT_DIR}/collect_sysmetrics.sh" "$csv_path" 1 &
  SYSMETRICS_PID=$!
  echo "  Sysmetrics collector started (PID ${SYSMETRICS_PID}) → ${csv_path}"
}

stop_sysmetrics() {
  if [[ -n "${SYSMETRICS_PID:-}" ]]; then
    kill "$SYSMETRICS_PID" 2>/dev/null || true
    wait "$SYSMETRICS_PID" 2>/dev/null || true
    SYSMETRICS_PID=""
  fi
}

# Stop collector if the whole script is interrupted
trap 'stop_sysmetrics' EXIT INT TERM

BENCHMARKS=(
  "01_auth_login.js"
  "02_posting_heavy.js"
  "03_likes_comments_reports.js"
  "04_personalized_ads.js"
  "05_newsfeed_algorithms.js"
  "06_analytics_dashboard.js"
  "07_workbook_teacher.js"
  "08_workbook_student.js"
)

PASS=0
FAIL=0

for bench in "${BENCHMARKS[@]}"; do
  name="${bench%.js}"
  echo "----------------------------------------------"
  echo " Running: ${name}"
  echo "----------------------------------------------"

  SUMMARY_FILE="${RESULTS_DIR}/${name}_summary.json"
  TIMESTAMP=$(date +%s)

  # -- Setup: load users from CSV or create via docker exec -----------------
  if [[ "$SKIP_USER_LIFECYCLE" == "true" ]]; then
    USERS_JSON="$PRELOADED_USERS_JSON"
    echo "  Using ${USER_COUNT} pre-created users from CSV."
  else
    echo "  Creating ${USER_COUNT} benchmark users (prefix: ${BENCH_PREFIX}${TIMESTAMP}_) ..."
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
  fi

  # -- Run k6 ---------------------------------------------------------------
  start_sysmetrics "${RESULTS_DIR}/${name}_sysmetrics.csv"
  if k6 run \
    -e "PROFILE=${PROFILE}" \
    -e "BASE_URL=${BASE_URL}" \
    -e "BENCH_HOST=${BENCH_HOST}" \
    -e "ADMIN_USER=${ADMIN_USER}" \
    -e "ADMIN_PASS=${ADMIN_PASS}" \
    -e "USERS_JSON=${USERS_JSON}" \
    --summary-export="${SUMMARY_FILE}" \
    -o "json=${RESULTS_DIR}/${name}_raw.json.gz" \
    "${SCRIPT_DIR}/${bench}" 2>&1 | tee "${RESULTS_DIR}/${name}.log"; then
    stop_sysmetrics
    echo " -> PASS"
    PASS=$((PASS + 1))
  else
    stop_sysmetrics
    echo " -> FAIL (see log for details)"
    FAIL=$((FAIL + 1))
  fi

  # -- Teardown: delete users (skipped for CSV mode) -----------------------
  if [[ "$SKIP_USER_LIFECYCLE" == "false" ]]; then
    echo "  Cleaning up benchmark users (prefix: ${BENCH_PREFIX}${TIMESTAMP}_) ..."
    docker exec "$CONTAINER" python manage.py shell -c "
from django.db import connection
from tenants.models import Domain
from django.contrib.auth import get_user_model
domain = Domain.objects.get(domain='${BENCH_HOST}')
connection.set_schema(domain.tenant.schema_name)
User = get_user_model()
prefix = '${BENCH_PREFIX}${TIMESTAMP}_'
deleted, _ = User.objects.filter(username__startswith=prefix).delete()
print('  Deleted %d users' % deleted)
" 2>&1 | tail -1
  fi

  echo ""
done

echo "=============================================="
echo " Summary: ${PASS} passed, ${FAIL} failed"
echo " Results saved to: ${RESULTS_DIR}"
echo "=============================================="
echo ""

# ---------------------------------------------------------------------------
# Per-benchmark overview table (parsed from --summary-export JSON files)
# ---------------------------------------------------------------------------
echo " Benchmark results overview"
echo " --------------------------"
printf " %-40s  %-6s  %-30s  %s\n" "Benchmark" "Status" "Primary metric (p95 ms)" "Checks"
printf " %-40s  %-6s  %-30s  %s\n" "$(printf '%0.s-' {1..40})" "------" "$(printf '%0.s-' {1..30})" "-------"

for bench in "${BENCHMARKS[@]}"; do
  name="${bench%.js}"
  SUMMARY_FILE="${RESULTS_DIR}/${name}_summary.json"

  if [[ ! -f "${SUMMARY_FILE}" ]]; then
    printf " %-40s  %-6s  %-30s  %s\n" "${name}" "SKIP" "no summary file" "-"
    continue
  fi

  # Determine pass/fail from exit-code tracking above (re-check via log file)
  STATUS="PASS"
  # k6 exits non-zero when thresholds fail; we tracked that in PASS/FAIL
  # Re-derive from log: k6 prints "FAIL" in the last line when thresholds breached
  if grep -q "✗\|FAIL\b" "${RESULTS_DIR}/${name}.log" 2>/dev/null; then
    STATUS="FAIL"
  fi

  # Extract the primary custom metric p95 and checks from JSON
  OVERVIEW=$(python3 - "${SUMMARY_FILE}" "${name}" <<'PYEOF'
import sys, json

summary_file = sys.argv[1]
bench_name   = sys.argv[2]

METRIC_MAP = {
    "01_auth_login":               "login_duration",
    "02_posting_heavy":            "post_create_duration",
    "03_likes_comments_reports":   "like_duration",
    "04_personalized_ads":         "feed_with_ads_duration",
    "05_newsfeed_algorithms":      "algo1_time_based_duration",
    "06_analytics_dashboard":      "analytics_duration",
    "07_workbook_teacher":         "section_list_duration",
    "08_workbook_student":         "section_browse_duration",
}

try:
    with open(summary_file) as f:
        data = json.load(f)
except Exception as e:
    print(f"err:read:{e}|0/0")
    sys.exit(0)

metrics = data.get("metrics", {})
primary = METRIC_MAP.get(bench_name, "http_req_duration")
m = metrics.get(primary, metrics.get("http_req_duration", {}))
p95 = m.get("p(95)", 0)

# Count checks
def collect_checks(group):
    total, failed = 0, 0
    for chk in group.get("checks", {}).values():
        total  += chk.get("passes", 0) + chk.get("fails", 0)
        failed += chk.get("fails", 0)
    for sub in group.get("groups", {}).values():
        t2, f2 = collect_checks(sub)
        total += t2; failed += f2
    return total, failed

root = data.get("root_group", {})
total_checks, failed_checks = collect_checks(root)
passed_checks = total_checks - failed_checks

label = f"{primary} p95={p95:.0f}ms"
checks = f"{passed_checks}/{total_checks}"
print(f"{label}|{checks}")
PYEOF
)

  PRIMARY_METRIC="${OVERVIEW%%|*}"
  CHECKS_SUMMARY="${OVERVIEW##*|}"

  printf " %-40s  %-6s  %-30s  %s\n" "${name}" "${STATUS}" "${PRIMARY_METRIC}" "${CHECKS_SUMMARY}"
done

echo ""
