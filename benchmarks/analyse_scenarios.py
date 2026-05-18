#!/usr/bin/env python3
"""
analyse_scenarios.py — Per-scenario latency breakdown from a k6 JSON lines file.

Usage:
    python3 benchmarks/analyse_scenarios.py <raw_json_gz_or_json>

The file is produced by k6's `-o json=FILE` flag (supported since k6 v0.36).
k6 writes one JSON object per line; gzip-compressed output is auto-detected.

For each scenario found in the data, prints a table of:
  - requests (samples)
  - p50 / p90 / p95 / p99 latency (ms)
  - error rate
  - throughput (req/s)

Works with both the overall `http_req_duration` metric and any custom Trend
metrics found in the file (e.g. post_create_duration, login_duration, etc.).
"""

import sys
import json
import gzip
import os
import math
from collections import defaultdict


def open_file(path):
    if path.endswith(".gz"):
        return gzip.open(path, "rt", encoding="utf-8")
    return open(path, "r", encoding="utf-8")


def percentile(sorted_values, p):
    if not sorted_values:
        return 0
    idx = math.ceil(p / 100 * len(sorted_values)) - 1
    return sorted_values[max(0, idx)]


def parse(path):
    """
    Parse the k6 JSON lines file and return:
      samples[scenario][metric_name] = sorted list of values (ms)
      errors[scenario] = (failed_count, total_count)
      timestamps[scenario] = (min_ts, max_ts)
    """
    samples = defaultdict(lambda: defaultdict(list))
    errors = defaultdict(lambda: [0, 0])  # [failed, total]
    timestamps = defaultdict(lambda: [float("inf"), float("-inf")])

    with open_file(path) as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            if obj.get("type") != "Point":
                continue

            metric = obj.get("metric", "")
            data = obj.get("data", {})
            value = data.get("value", 0)
            tags = data.get("tags", {})
            ts_str = data.get("time", "")
            scenario = tags.get("scenario", "<no_scenario>")

            # Track time range per scenario for throughput calculation
            # (timestamps are ISO-8601 strings; we use line order as proxy)
            # Parse epoch from time string — k6 uses RFC3339
            if ts_str:
                try:
                    import datetime

                    # Python 3.11+ fromisoformat handles Z; earlier needs replace
                    ts = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    epoch = ts.timestamp()
                    if epoch < timestamps[scenario][0]:
                        timestamps[scenario][0] = epoch
                    if epoch > timestamps[scenario][1]:
                        timestamps[scenario][1] = epoch
                except Exception:
                    pass

            if metric == "http_req_failed":
                errors[scenario][1] += 1
                if value == 1:
                    errors[scenario][0] += 1
                continue

            # Collect duration metrics (Trend type, value is ms)
            if metric in ("http_req_duration",) or metric.endswith("_duration"):
                samples[scenario][metric].append(value)

    # Sort all sample lists
    for scenario in samples:
        for metric in samples[scenario]:
            samples[scenario][metric].sort()

    return samples, errors, timestamps


def render_table(samples, errors, timestamps):
    all_scenarios = sorted(set(list(samples.keys()) + list(errors.keys())))
    if not all_scenarios:
        print("No scenario data found.")
        return

    # Collect all metric names that appear
    all_metrics = set()
    for sc in samples.values():
        all_metrics.update(sc.keys())

    # Prefer http_req_duration as primary; also show custom Trend metrics
    primary = "http_req_duration"
    custom_metrics = sorted(
        m for m in all_metrics if m != primary and m.endswith("_duration")
    )
    ordered_metrics = ([primary] if primary in all_metrics else []) + custom_metrics

    for metric in ordered_metrics:
        print(f"\n{'─' * 72}")
        print(f"  Metric: {metric}")
        print(f"{'─' * 72}")
        header = f"  {'Scenario':<30}  {'n':>6}  {'p50':>7}  {'p90':>7}  {'p95':>7}  {'p99':>7}  {'err%':>6}  {'rps':>6}"
        print(header)
        print(
            f"  {'-' * 30}  {'------':>6}  {'-------':>7}  {'-------':>7}  {'-------':>7}  {'-------':>7}  {'------':>6}  {'------':>6}"
        )

        for scenario in all_scenarios:
            if scenario in ("setup", "teardown", "<no_scenario>"):
                continue
            vals = samples.get(scenario, {}).get(metric, [])
            n = len(vals)
            p50 = percentile(vals, 50)
            p90 = percentile(vals, 90)
            p95 = percentile(vals, 95)
            p99 = percentile(vals, 99)

            fail, total = errors.get(scenario, [0, 0])
            err_pct = (fail / total * 100) if total else 0.0

            ts = timestamps.get(scenario, [0, 0])
            duration_s = max(ts[1] - ts[0], 1)
            # Use http_req_duration sample count for rps (each sample = 1 request)
            req_samples = samples.get(scenario, {}).get(primary, [])
            rps = len(req_samples) / duration_s if req_samples else 0

            print(
                f"  {scenario:<30}  {n:>6}  {p50:>6.0f}ms  {p90:>6.0f}ms  "
                f"{p95:>6.0f}ms  {p99:>6.0f}ms  {err_pct:>5.1f}%  {rps:>5.1f}/s"
            )

    # Setup / teardown rows summary
    for special in ("setup", "teardown"):
        if special in samples:
            vals = samples[special].get(primary, [])
            if vals:
                print(
                    f"\n  [{special}] {primary}: {len(vals)} requests, "
                    f"p95={percentile(vals, 95):.0f}ms"
                )


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 benchmarks/analyse_scenarios.py <file.json.gz|file.json>")
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.exists(path):
        print(f"File not found: {path}")
        sys.exit(1)

    print(f"Parsing: {path}")
    samples, errors, timestamps = parse(path)

    total_points = sum(len(v) for sc in samples.values() for v in sc.values())
    print(f"Loaded {total_points} data points across {len(samples)} scenarios\n")

    render_table(samples, errors, timestamps)
    print()


if __name__ == "__main__":
    main()
