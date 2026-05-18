#!/usr/bin/env bash
#
# delete_remote_users.sh — Delete benchmark users that were previously created
# by create_remote_users.sh on a remote host.
#
# Usage:
#   ./benchmarks/delete_remote_users.sh <ssh_target> [csv_file]
#
#   ssh_target   SSH destination, e.g. root@167.235.110.98
#   csv_file     The CSV file produced by create_remote_users.sh
#                (default: benchmarks/bench_users.csv)
#
# Environment variables:
#   BENCH_HOST   Tenant domain (default: derived from ssh target IP)
#   CONTAINER    Backend container name (default: auto-detected)
#
set -euo pipefail

SSH_TARGET="${1:?Usage: delete_remote_users.sh <ssh_target> [csv_file]}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CSV_FILE="${2:-${SCRIPT_DIR}/bench_users.csv}"

BENCH_HOST="${BENCH_HOST:-$(echo "$SSH_TARGET" | sed 's/.*@//')}"

if [[ ! -f "$CSV_FILE" ]]; then
  echo "Error: CSV file not found: ${CSV_FILE}"
  exit 1
fi

# Collect usernames from CSV
USERNAMES=$(tail -n +2 "$CSV_FILE" | cut -d',' -f2 | paste -sd',' -)

if [[ -z "${CONTAINER:-}" ]]; then
  CONTAINER=$(ssh "$SSH_TARGET" "docker ps --filter 'name=backend' --format '{{.Names}}' | head -1")
fi

echo "Deleting users from ${CSV_FILE} on ${SSH_TARGET} ..."

ssh "$SSH_TARGET" "docker exec ${CONTAINER} python manage.py shell -c \"
import sys
from django.db import connection
from tenants.models import Domain
from django.contrib.auth import get_user_model

hostname = '${BENCH_HOST}'
domain = Domain.objects.get(domain=hostname)
connection.set_schema(domain.tenant.schema_name)
User = get_user_model()
usernames = '${USERNAMES}'.split(',')
deleted, _ = User.objects.filter(username__in=usernames).delete()
print('Deleted %d users' % deleted)
\""

echo "Done."
