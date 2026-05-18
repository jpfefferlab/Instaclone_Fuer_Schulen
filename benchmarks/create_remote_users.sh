#!/usr/bin/env bash
#
# create_remote_users.sh — Create benchmark users on a remote host via SSH
# and export their credentials to a local CSV file.
#
# The CSV can then be passed to run_single.sh / run_all.sh via USERS_CSV
# so that the benchmark scripts skip user creation entirely and work fully
# remotely (no docker exec needed from the machine running k6).
#
# Usage:
#   ./benchmarks/create_remote_users.sh <ssh_target> [user_count] [output_csv]
#
#   ssh_target   SSH destination, e.g. root@167.235.110.98
#   user_count   Number of users to create (default: 5)
#   output_csv   Output CSV path (default: benchmarks/bench_users.csv)
#
# Environment variables (override as needed):
#   BENCH_HOST     Tenant domain registered in django (default: derived from
#                  ssh target IP or set explicitly)
#   BENCH_PREFIX   Username prefix (default: k6bench_)
#   BENCH_PASS     Password for created users (default: BenchPass123!)
#   CONTAINER      Backend container name on the remote host
#                  (default: auto-detected)
#
# Example:
#   # Create 50 users on remote host, tenant domain = the IP itself
#   BENCH_HOST=167.235.110.98 ./benchmarks/create_remote_users.sh root@167.235.110.98 50
#
#   # Then run benchmarks locally pointing at the remote host
#   USERS_CSV=benchmarks/bench_users.csv BASE_URL=http://167.235.110.98 \
#     ./benchmarks/run_single.sh 1 smoke
#
set -euo pipefail

SSH_TARGET="${1:?Usage: create_remote_users.sh <ssh_target> [user_count] [output_csv]}"
USER_COUNT="${2:-5}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_CSV="${3:-${SCRIPT_DIR}/bench_users.csv}"

BENCH_PREFIX="${BENCH_PREFIX:-k6bench_}"
BENCH_PASS="${BENCH_PASS:-BenchPass123!}"
TIMESTAMP=$(date +%s)

# If BENCH_HOST is not set, derive from SSH_TARGET (strip user@)
BENCH_HOST="${BENCH_HOST:-$(echo "$SSH_TARGET" | sed 's/.*@//')}"

echo "=============================================="
echo " Remote Benchmark User Provisioning"
echo " SSH target : ${SSH_TARGET}"
echo " Tenant host: ${BENCH_HOST}"
echo " User count : ${USER_COUNT}"
echo " Prefix     : ${BENCH_PREFIX}${TIMESTAMP}_"
echo " Output CSV : ${OUTPUT_CSV}"
echo "=============================================="
echo ""

# ---------------------------------------------------------------------------
# Detect backend container on the remote host (if not provided)
# ---------------------------------------------------------------------------
if [[ -z "${CONTAINER:-}" ]]; then
  CONTAINER=$(ssh "$SSH_TARGET" "docker ps --filter 'name=backend' --format '{{.Names}}' | head -1")
  if [[ -z "$CONTAINER" ]]; then
    echo "Error: No running container with 'backend' in its name on ${SSH_TARGET}."
    exit 1
  fi
fi
echo "Using remote container: ${CONTAINER}"

# ---------------------------------------------------------------------------
# Create users on the remote host and capture JSON output
# ---------------------------------------------------------------------------
echo "Creating ${USER_COUNT} users on remote host ..."

USERS_JSON=$(ssh "$SSH_TARGET" "docker exec ${CONTAINER} python manage.py shell -c \"
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
\"")

# ---------------------------------------------------------------------------
# Convert JSON to CSV
# ---------------------------------------------------------------------------
echo "$USERS_JSON" | python3 -c "
import csv, json, sys
users = json.load(sys.stdin)
writer = csv.DictWriter(sys.stdout, fieldnames=['id', 'username', 'password'])
writer.writeheader()
for u in users:
    writer.writerow(u)
" > "$OUTPUT_CSV"

ACTUAL_COUNT=$(tail -n +2 "$OUTPUT_CSV" | wc -l)
echo ""
echo "Done. ${ACTUAL_COUNT} users written to ${OUTPUT_CSV}"
echo ""
echo "To run benchmarks with these users:"
echo "  USERS_CSV=${OUTPUT_CSV} BASE_URL=http://${BENCH_HOST} \\"
echo "    ./benchmarks/run_single.sh 1 smoke"
echo ""
echo "To delete these users later:"
echo "  ./benchmarks/delete_remote_users.sh ${SSH_TARGET} ${OUTPUT_CSV}"
