#!/usr/bin/env bash
#
# collect_sysmetrics.sh — Poll Docker container metrics while a k6 run is active.
#
# Usage (called by run_single.sh / run_all.sh — not normally run manually):
#   ./benchmarks/collect_sysmetrics.sh <output_csv> [interval_seconds]
#
# Output CSV columns:
#   timestamp_unix, container, cpu_pct, mem_mb, mem_limit_mb
#
# For the DB container one additional row per tick is appended:
#   timestamp_unix, __pg_conns__, <active_connection_count>, 0, 0
#
# The script exits cleanly on SIGTERM / SIGINT (sent by the parent runner).
#
set -uo pipefail

OUTPUT="${1:?Usage: collect_sysmetrics.sh <output_csv> [interval_seconds]}"
INTERVAL="${2:-1}"

# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------
_STOP=0
trap '_STOP=1' SIGTERM SIGINT

# ---------------------------------------------------------------------------
# Helper: parse "412.3MiB / 15.56GiB" → two values in MB
# Handles: B, KiB, MiB, GiB, TiB (and the non-suffix byte variants kB, MB, GB)
# ---------------------------------------------------------------------------
parse_mem() {
    # $1 = full MemUsage string, e.g.  "412.3MiB / 15.56GiB"
    local raw="$1"
    local used limit
    used=$(echo "$raw"  | awk '{print $1}')
    limit=$(echo "$raw" | awk '{print $3}')

    to_mb() {
        local val="$1"
        local num unit
        num=$(echo "$val" | sed 's/[^0-9.]//g')
        unit=$(echo "$val" | sed 's/[0-9.]//g' | tr '[:upper:]' '[:lower:]')
        case "$unit" in
            b)            echo "$num" | awk '{printf "%.3f", $1/1048576}' ;;
            kb|kib)       echo "$num" | awk '{printf "%.3f", $1/1024}' ;;
            mb|mib)       echo "$num" | awk '{printf "%.3f", $1}' ;;
            gb|gib)       echo "$num" | awk '{printf "%.3f", $1*1024}' ;;
            tb|tib)       echo "$num" | awk '{printf "%.3f", $1*1048576}' ;;
            *)            echo "$num" ;;  # assume MB as fallback
        esac
    }

    echo "$(to_mb "$used"),$(to_mb "$limit")"
}

# ---------------------------------------------------------------------------
# Helper: strip the % sign from a cpu string like "38.20%"
# ---------------------------------------------------------------------------
parse_cpu() {
    echo "$1" | tr -d '%'
}

# ---------------------------------------------------------------------------
# Detect containers (by partial name match)
# ---------------------------------------------------------------------------
get_container() {
    # $1 = substring to match in container name
    docker ps --format "{{.Names}}" 2>/dev/null | grep -i "$1" | head -1
}

BACKEND_CTR=$(get_container "backend")
DB_CTR=$(get_container "db\|postgres\|postgresql")
REDIS_CTR=$(get_container "redis")

# Collect only the containers that actually exist
CONTAINERS=()
[[ -n "$BACKEND_CTR" ]] && CONTAINERS+=("$BACKEND_CTR")
[[ -n "$DB_CTR"      ]] && CONTAINERS+=("$DB_CTR")
[[ -n "$REDIS_CTR"   ]] && CONTAINERS+=("$REDIS_CTR")

if [[ ${#CONTAINERS[@]} -eq 0 ]]; then
    echo "[sysmetrics] WARNING: No matching containers found. CSV will be empty." >&2
fi

# ---------------------------------------------------------------------------
# Write CSV header
# ---------------------------------------------------------------------------
echo "timestamp_unix,container,cpu_pct,mem_mb,mem_limit_mb" > "$OUTPUT"

# ---------------------------------------------------------------------------
# Main polling loop
# ---------------------------------------------------------------------------
while [[ $_STOP -eq 0 ]]; do
    TS=$(date +%s)

    # -- docker stats (non-blocking snapshot) ---------------------------------
    if [[ ${#CONTAINERS[@]} -gt 0 ]]; then
        # Build a filter list for docker stats
        FILTER_ARGS=()
        for ctr in "${CONTAINERS[@]}"; do
            FILTER_ARGS+=("$ctr")
        done

        docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
            "${FILTER_ARGS[@]}" 2>/dev/null \
        | while IFS=$'\t' read -r name cpu mem; do
            cpu_clean=$(parse_cpu "$cpu")
            mem_vals=$(parse_mem "$mem")
            echo "${TS},${name},${cpu_clean},${mem_vals}"
        done >> "$OUTPUT"
    fi

    # -- pg_stat_activity: active connection count ----------------------------
    if [[ -n "$DB_CTR" ]]; then
        PG_CONNS=$(docker exec "$DB_CTR" \
            psql -U postgres -tAc \
            "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" \
            2>/dev/null | tr -d '[:space:]')
        if [[ -n "$PG_CONNS" && "$PG_CONNS" =~ ^[0-9]+$ ]]; then
            echo "${TS},__pg_conns__,${PG_CONNS},0,0" >> "$OUTPUT"
        fi
    fi

    # Sleep respecting SIGTERM (use `sleep` in background so trap fires promptly)
    sleep "$INTERVAL" &
    wait $! 2>/dev/null || true
done

echo "[sysmetrics] Collector stopped. Output: ${OUTPUT}" >&2
