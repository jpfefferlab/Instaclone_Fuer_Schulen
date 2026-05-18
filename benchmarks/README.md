# InstaClone k6 Benchmarks

## Prerequisites

1. **k6** installed ([install guide](https://grafana.com/docs/k6/latest/set-up/install-k6/))
   - On NixOS / without a global install: `nix-shell -p k6 --run "./benchmarks/run_single.sh 1"`
2. A running InstaClone stack (e.g. `docker compose -f docker-compose.dev.yml up -d`)
3. A valid teacher/staff account for teacher-only endpoints (commonly `Teacher` /
   `teacherPassword` in local setups). If your environment differs, pass
   `ADMIN_USER` and `ADMIN_PASS` explicitly.

## How user creation works

Benchmark users are created and deleted via `docker exec` before and after each
run. The shell runner scripts handle this automatically — you do not need to
touch the backend.

| Step                   | Who does it                                                  | How                                                     |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| Create N users         | `run_single.sh` / `run_all.sh`                               | `docker exec <backend> python manage.py shell -c "..."` |
| Pass credentials to k6 | Runner script                                                | `USERS_JSON` env var (JSON array)                       |
| Login & enrich tokens  | k6 `setup()` via `setupUsersWithTokens()` (benchmarks 02–08) | `POST /api/auth/login/` + `GET /api/users/me/`          |
| Delete users           | Runner script (after k6 exits)                               | `docker exec <backend> python manage.py shell -c "..."` |

User cleanup is handled by the shell runner (after k6 exits), so benchmark users
are deleted even if k6 crashes. Some benchmarks may still use `teardown()` for
non-user fixture cleanup (for example temporary ads or workbook sections).

## Benchmarks

| #   | File                           | Use-Case                         | What it tests                                                                                 |
| --- | ------------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | `01_auth_login.js`             | **Auth Login**                   | Login throughput, profile fetch (`/api/users/me/`)                                            |
| 2   | `02_posting_heavy.js`          | **Posting Heavy**                | Post creation with images, feed refresh (read-after-write)                                    |
| 3   | `03_likes_comments_reports.js` | **Likes / Comments / Meldungen** | High-frequency likes, comments, post reports, moderation list                                 |
| 4   | `04_personalized_ads.js`       | **Personalized Advertisements**  | Targeted ad creation, feed with ads injected by demographics                                  |
| 5   | `05_newsfeed_algorithms.js`    | **Compare News Feed Algorithms** | Side-by-side ALGORITHM_1 (time) vs 2 (popularity) vs 3 (EdgeRank)                             |
| 6   | `06_analytics_dashboard.js`    | **Analytics Dashboard**          | Aggregation endpoint under concurrent load                                                    |
| 7   | `07_workbook_teacher.js`       | **Workbook Lehrer Seite**        | Teacher: list sections, review exercises, check submissions, restrict/unrestrict users        |
| 8   | `08_workbook_student.js`       | **Workbook Schueler Seite**      | Student: browse sections/exercises, submit MC/text/interactive, claim points, unlock features |

## Load profiles

Each benchmark supports three profiles via `-e PROFILE=...`:

| Profile    | Structure                                               | Total time | Users created | Purpose                                    |
| ---------- | ------------------------------------------------------- | ---------- | ------------- | ------------------------------------------ |
| `smoke`    | flat 3 VUs                                              | 30 s       | 5             | Validate scripts work                      |
| `baseline` | 0 → 20 → 50 (hold) → 0                                  | ~7 min     | 50            | Record baseline KPIs                       |
| `stress`   | 4 sequential plateaus: warmup / 50 VU / 150 VU / 300 VU | ~5 min     | 300           | Find breaking points per concurrency level |

### Stress profile detail

The stress profile uses **four named scenarios** instead of a single
ramping-vus. Each scenario is a separate concurrency level that runs
independently and non-overlapping:

| Scenario suffix | Start time | VUs | Ramp | Hold | Purpose                      |
| --------------- | ---------- | --- | ---- | ---- | ---------------------------- |
| `_warmup`       | 0:00       | 10  | 15 s | 15 s | Warm up JVM / DB connections |
| `_50vu`         | 0:30       | 50  | 20 s | 70 s | Low concurrency baseline     |
| `_150vu`        | 2:00       | 150 | 20 s | 70 s | Mid-range stress             |
| `_300vu`        | 3:30       | 300 | 20 s | 70 s | Peak stress                  |

Because each scenario is a separate k6 scenario,
**every metric is automatically tagged `scenario=<name>`**. In the
`--summary-export` JSON you get per-level breakdowns for every metric
(latency p50/p95/p99, error rate, throughput) without any post-processing.
For example, for benchmark 01:

```
metrics.login_duration{scenario: auth_login_50vu}   → p95 at 50 VUs
metrics.login_duration{scenario: auth_login_150vu}  → p95 at 150 VUs
metrics.login_duration{scenario: auth_login_300vu}  → p95 at 300 VUs
```

## Running

### Single benchmark

```bash
# Smoke test — benchmark #1
./benchmarks/run_single.sh 1

# Baseline — benchmark #5
./benchmarks/run_single.sh 5 baseline

# Stress — benchmark by name
./benchmarks/run_single.sh 03_likes_comments_reports stress
```

### All benchmarks sequentially

```bash
./benchmarks/run_all.sh              # smoke
./benchmarks/run_all.sh baseline     # baseline
./benchmarks/run_all.sh stress       # stress
```

Results (JSON summaries + logs) are saved to `benchmarks/results/<timestamp>_<profile>/`.

### Running k6 directly (advanced)

> [!NOTE]
> You might need this when running the benchmark against remote clusters.

If you want to pass your own `USERS_JSON`, you can skip the runner scripts.
Note that users **must** be created inside the correct tenant schema:

```bash
BENCH_HOST=myclassdev.instaclone.de   # must match a row in tenants_domain table

# 1. Create users in the correct tenant schema
USERS_JSON=$(docker exec <backend_container> python manage.py shell -c "
import json, sys
from django.db import connection
from tenants.models import Domain
from django.contrib.auth import get_user_model
domain = Domain.objects.get(domain='${BENCH_HOST}')
connection.set_schema(domain.tenant.schema_name)
User = get_user_model()
users = []
for i in range(5):
    u = User.objects.create_user(f'k6test_{i}', password='BenchPass123!')
    users.append({'id': u.pk, 'username': u.username, 'password': 'BenchPass123!'})
sys.stdout.write(json.dumps(users))
")

# 2. Run k6
k6 run \
  -e BASE_URL=http://localhost:80 \
  -e BENCH_HOST="${BENCH_HOST}" \
  -e PROFILE=smoke \
  -e USERS_JSON="$USERS_JSON" \
  benchmarks/01_auth_login.js

# 3. Clean up
docker exec <backend_container> python manage.py shell -c "
from django.db import connection
from tenants.models import Domain
from django.contrib.auth import get_user_model
domain = Domain.objects.get(domain='${BENCH_HOST}')
connection.set_schema(domain.tenant.schema_name)
User = get_user_model()
User.objects.filter(username__startswith='k6test_').delete()
"
```

### Environment variables

| Variable       | Default                                                      | Description                                                       |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| `BASE_URL`     | `http://localhost:80`                                        | Target instance URL                                               |
| `BENCH_HOST`   | derived from `BASE_URL`                                      | `Host` header for tenant routing — must match a tenant domain row |
| `ADMIN_USER`   | `admin` (`run_single.sh`) / `Teacher` (`run_all.sh`)         | Teacher/staff username for teacher-only endpoints                 |
| `ADMIN_PASS`   | `admin` (`run_single.sh`) / `teacherPassword` (`run_all.sh`) | Teacher/staff password                                            |
| `PROFILE`      | `smoke`                                                      | Load profile (`smoke` / `baseline` / `stress`)                    |
| `BENCH_PREFIX` | `k6bench_`                                                   | Username prefix for created benchmark users                       |
| `BENCH_PASS`   | `BenchPass123!`                                              | Password for benchmark users                                      |

## Interpreting results

k6 outputs a summary with these key metrics per benchmark:

- **http_req_duration** p50/p90/p95/p99 — overall request latency
- **Custom trends** (e.g. `login_duration`, `post_create_duration`) — per-operation latency
- **http_req_failed** — error rate
- **iteration_duration** — time per complete VU iteration
- **vus_max** — peak concurrent virtual users

To estimate concurrent-user capacity for a given use-case, run the `stress` profile and find the VU count where:

- p95 latency stays below the threshold (e.g. < 2 s)
- Error rate stays well below 1 %

## Backend saturation — known constraints

### Gunicorn workers

The backend CMD now reads `WEB_CONCURRENCY` from the environment (`.env` → `docker-compose.yaml` → container):

```dockerfile
CMD sh -c "python /scripts/init_django.py && exec gunicorn \
  --bind 0.0.0.0:8000 \
  --workers ${WEB_CONCURRENCY:-2} \
  --timeout 120 \
  InstaClone.wsgi:application"
```

**Worker count guidelines:**

| Host CPUs | Recommended workers | Formula |
|-----------|--------------------|---------|
| 2 | 4–5 | `2 × CPU + 1` |
| 4 | 9 | `2 × CPU + 1` |
| 8 | 17 | `2 × CPU + 1` |

## Benchmark details

### 01 — Auth Login (`01_auth_login.js`)

**Purpose:** Measure authentication throughput and profile-fetch latency under concurrent load.

| Phase        | Actions                                           |
| ------------ | ------------------------------------------------- |
| Setup        | Load benchmark user credentials from `USERS_JSON` |
| VU iteration | `POST /api/auth/login/` → `GET /api/users/me/`    |
| Teardown     | None (users deleted by shell runner)              |

**Endpoints:** `POST /api/auth/login/`, `GET /api/users/me/`

| Metric                 | Threshold |
| ---------------------- | --------- |
| `login_duration` p95   | < 800 ms  |
| `profile_duration` p95 | < 400 ms  |
| `login_fail_rate`      | < 1 %     |

> **Stress finding (example from historical local runs):** Some environments
> show clear saturation around ~50 concurrent VUs (~4–5 req/s), after which
> throughput flattens while latency grows. Treat this as environment-specific:
> worker count, CPU limits, DB performance, and tenant data shape all affect
> the knee point.

---

### 02 — Posting Heavy (`02_posting_heavy.js`)

**Purpose:** Stress the write path (post creation with image upload) and verify
read-after-write consistency via feed pagination.

| Phase        | Actions                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Setup        | Login all benchmark users                                                                                                                 |
| VU iteration | `POST /api/posts/` (800×600 JPEG, `tags:"[]"`) → `GET /api/feed/?page=1` → `GET /api/feed/?page=2` → optionally `DELETE /api/posts/{id}/` |
| Teardown     | None                                                                                                                                      |

**Endpoints:** `POST /api/posts/`, `GET /api/feed/`, `DELETE /api/posts/{id}/`

| Metric                      | Threshold  |
| --------------------------- | ---------- |
| `post_create_duration` p95  | < 1 500 ms |
| `feed_refresh_duration` p95 | < 1 000 ms |
| `post_fail_rate`            | < 1 %      |

---

### 03 — Likes / Comments / Reports (`03_likes_comments_reports.js`)

**Purpose:** Simulate high-frequency social interactions (likes, comments) and the teacher moderation flow (reports list).

| Phase        | Actions                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup        | Login all benchmark users; each user creates 2 posts                                                                                                                   |
| VU iteration | `POST /api/likes/` → `POST /api/comments/` → `POST /api/post-reports/` → `GET /api/post-reports/` (teacher) → `DELETE /api/likes/{id}/` → `DELETE /api/comments/{id}/` |
| Teardown     | None                                                                                                                                                                   |

**Endpoints:** `POST /api/likes/`, `DELETE /api/likes/{id}/`, `POST /api/comments/`, `DELETE /api/comments/{id}/`, `POST /api/post-reports/`, `GET /api/post-reports/`

| Metric                 | Threshold |
| ---------------------- | --------- |
| `like_duration` p95    | < 400 ms  |
| `comment_duration` p95 | < 500 ms  |
| `report_duration` p95  | < 500 ms  |
| `engagement_fail_rate` | < 2 %     |

---

### 04 — Personalized Advertisements (`04_personalized_ads.js`)

**Purpose:** Test targeted ad delivery — teacher creates demographic-targeted ads, students scroll feeds and receive injected advertisements.

| Phase        | Actions                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Setup        | Teacher logs in and creates 3–5 ads (`POST /api/advertisements/`) with interest/gender targeting; benchmark users log in |
| VU iteration | `GET /api/feed/?page=1` → `GET /api/feed/?page=2` → `GET /api/feed/?page=3` → `GET /api/advertisements/`                 |
| Teardown     | None                                                                                                                     |

**Endpoints:** `POST /api/advertisements/`, `GET /api/feed/`, `GET /api/advertisements/`

| Metric                       | Threshold  |
| ---------------------------- | ---------- |
| `feed_with_ads_duration` p95 | < 1 200 ms |
| `ad_fail_rate`               | < 2 %      |

---

### 05 — Newsfeed Algorithms (`05_newsfeed_algorithms.js`)

**Purpose:** Side-by-side latency comparison of the three newsfeed ranking algorithms under identical load.

| Phase        | Actions                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Setup        | Login users; assign each user a round-robin algorithm (`ALGORITHM_1` / `ALGORITHM_2` / `ALGORITHM_3`) via `PATCH /api/user-settings/{id}/` |
| VU iteration | Inside named groups `newsfeed_ALGORITHM_N`: `GET /api/feed/?page=1,2,3` using the user's assigned algorithm                                |
| Teardown     | None                                                                                                                                       |

**Endpoints:** `PATCH /api/user-settings/{id}/`, `GET /api/feed/?page=N`

| Metric                          | Threshold  |
| ------------------------------- | ---------- |
| `algo1_time_based_duration` p95 | < 800 ms   |
| `algo2_popularity_duration` p95 | < 1 000 ms |
| `algo3_edgerank_duration` p95   | < 1 500 ms |
| `feed_fail_rate`                | < 2 %      |

> **Note:** In the current backend code, `ALGORITHM_3` is implemented and selectable.
> If updates to user settings fail (e.g. missing `settingsId`), affected users may
> fall back to default algorithm behavior.

---

### 06 — Analytics Dashboard (`06_analytics_dashboard.js`)

**Purpose:** Measure aggregation query performance by hammering the teacher analytics endpoint under concurrent load.

| Phase        | Actions                                                                                 |
| ------------ | --------------------------------------------------------------------------------------- |
| Setup        | Teacher logs in                                                                         |
| VU iteration | `GET /api/analytics/` (checks `total_student_count` and `total_post_count` in response) |
| Teardown     | None                                                                                    |

**Endpoints:** `GET /api/analytics/`

| Metric                   | Threshold  |
| ------------------------ | ---------- |
| `analytics_duration` p95 | < 2 000 ms |
| `analytics_fail_rate`    | < 2 %      |

---

### 07 — Workbook Teacher Side (`07_workbook_teacher.js`)

**Purpose:** Simulate a teacher reviewing the workbook (sections, exercises, submissions) and performing moderation actions (restrict/unrestrict users).

| Phase                         | Actions                                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup                         | Teacher logs in; loads benchmark users; creates a section; discovers existing exercises/tasks via `GET /api/workbook/sections/`; creates seed submissions |
| VU group `teacher_workbook`   | `GET /api/workbook/sections/` → `GET /api/workbook/exercises/{id}/` → `GET /api/workbook/submissions/{taskId}/`                                           |
| VU group `teacher_moderation` | `GET /api/post-reports/` → `POST /api/restricted-users/restrict/` → `POST /api/restricted-users/unrestrict/`                                              |
| Teardown                      | Optional `DELETE /api/workbook/sections/{id}/` for section created in setup                                                                               |

**Endpoints:** `GET /api/workbook/sections/`, `GET /api/workbook/exercises/{id}/`, `GET /api/workbook/submissions/{taskId}/`, `GET /api/post-reports/`, `POST /api/restricted-users/restrict/`, `POST /api/restricted-users/unrestrict/`

| Metric                           | Threshold |
| -------------------------------- | --------- |
| `section_list_duration` p95      | < 600 ms  |
| `exercise_detail_duration` p95   | < 600 ms  |
| `submission_review_duration` p95 | < 700 ms  |
| `restrict_user_duration` p95     | < 700 ms  |
| `teacher_fail_rate`              | < 2 %     |

> **Note:** `exercise_detail_duration` and `submission_review_duration` will be 0 if no exercises exist in the workbook (fresh install).

---

### 08 — Workbook Student Side (`08_workbook_student.js`)

**Purpose:** Simulate a student browsing workbook sections and exercises, submitting answers, and checking points and feature unlocks.

| Phase                      | Actions                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup                      | Login benchmark users; discover existing workbook exercises/tasks and available features                                                                                                                    |
| VU group `browse_workbook` | `GET /api/workbook/sections/` → `GET /api/workbook/exercises/{id}/`                                                                                                                                         |
| VU group `submit_answers`  | `POST /api/workbook/submissions/multiple-choice/` OR `POST /api/workbook/submissions/text-answer/` OR `POST /api/workbook/submissions/interactive/` → `GET /api/workbook/user-submissions/?exercise_id=...` |
| VU group `rewards`         | `GET /api/user/points/` → `GET /api/user/features/` → `POST /api/features/unlock/`                                                                                                                          |
| Teardown                   | None                                                                                                                                                                                                        |

**Endpoints:** `GET /api/workbook/sections/`, `GET /api/workbook/exercises/{id}/`, `POST /api/workbook/submissions/multiple-choice/`, `POST /api/workbook/submissions/text-answer/`, `POST /api/workbook/submissions/interactive/`, `GET /api/workbook/user-submissions/?exercise_id=...`, `GET /api/user/points/`, `GET /api/user/features/`, `POST /api/features/unlock/`

| Metric                         | Threshold |
| ------------------------------ | --------- |
| `section_browse_duration` p95  | < 600 ms  |
| `exercise_browse_duration` p95 | < 600 ms  |
| `submission_duration` p95      | < 700 ms  |
| `points_duration` p95          | < 400 ms  |
| `student_fail_rate`            | < 2 %     |

> **Note:** `submission_duration` and `exercise_browse_duration` will be 0 if no exercises or tasks were seeded (fresh install).

## Remote Testing

For remote testing we include scripts to pre-generate user accounts and then perform the benchmark fully-remotely with pre-generated puppeteered user accounts.

Example usage:

```bash
λ BENCH_HOST=167.235.110.98 ./benchmarks/create_remote_users.sh root@159.69.144.23
300
==============================================
 Remote Benchmark User Provisioning
 SSH target : root@159.69.144.23
 Tenant host: 167.235.110.98
 User count : 300
 Prefix     : k6bench_1778079607_
 Output CSV : ./benchmarks/bench_users.csv
==============================================

Using remote container: app-instaclone-backend-1
Creating 300 users on remote host ...
Done. 300 users written to ./benchmarks/bench_users.csv

To run benchmarks with these users:
  USERS_CSV=./benchmarks/bench_users.csv BASE_URL=http://167.235.110.98 \
    ./benchmarks/run_single.sh 1 smoke

To delete these users later:
  ./benchmarks/delete_remote_users.sh root@159.69.144.23 ./benchmarks/bench_users.csv
```
