/**
 * Shared configuration for all k6 benchmark scenarios.
 *
 * Override at runtime with environment variables:
 *   k6 run -e BASE_URL=http://myhost:8000 -e ADMIN_USER=admin ...
 */

// ---------------------------------------------------------------------------
// Target instance
// ---------------------------------------------------------------------------
export const BASE_URL = __ENV.BASE_URL || "http://localhost:80";

// ---------------------------------------------------------------------------
// Admin / teacher credentials — used to create and tear-down test fixtures.
// The teacher account is auto-created by the Django management command
// `create_teacher_user` with these defaults.
// ---------------------------------------------------------------------------
export const ADMIN_USER = __ENV.ADMIN_USER || "Teacher";
export const ADMIN_PASS = __ENV.ADMIN_PASS || "teacherPassword";

// ---------------------------------------------------------------------------
// Benchmark user prefix — every benchmark creates ephemeral users whose
// usernames start with this prefix so they can be identified and cleaned up.
// ---------------------------------------------------------------------------
export const USER_PREFIX = __ENV.USER_PREFIX || "k6bench_";

// ---------------------------------------------------------------------------
// Default password for benchmark-created users
// ---------------------------------------------------------------------------
export const DEFAULT_PASS = __ENV.DEFAULT_PASS || "BenchPass123!";

// ---------------------------------------------------------------------------
// Load profile presets — callers pick one via __ENV.PROFILE (smoke|baseline|stress)
// ---------------------------------------------------------------------------

/**
 * Build the stress scenarios object for a given benchmark scenario name.
 *
 * The stress profile uses four sequential, non-overlapping ramping-vus scenarios
 * so that k6 automatically tags every metric with the active scenario name
 * (e.g. "auth_login_50vu").  This lets you slice latency and error rates by
 * concurrency level directly from the --summary-export JSON without any
 * post-processing.
 *
 * Timeline (~5 min total):
 *   0:00 – 0:30  <name>_warmup  : 0 → 10 VUs (15 s ramp + 15 s hold)
 *   0:30 – 2:00  <name>_50vu   : 0 → 50 VUs (20 s ramp + 70 s hold)
 *   2:00 – 3:30  <name>_150vu  : 0 → 150 VUs (20 s ramp + 70 s hold)
 *   3:30 – 5:00  <name>_300vu  : 0 → 300 VUs (20 s ramp + 70 s hold)
 */
function buildStressScenarios(name) {
  return {
    [`${name}_warmup`]: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "0s",
      stages: [
        { duration: "15s", target: 10 },
        { duration: "15s", target: 10 },
      ],
      gracefulRampDown: "5s",
    },
    [`${name}_50vu`]: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "30s",
      stages: [
        { duration: "20s", target: 50 },
        { duration: "70s", target: 50 },
      ],
      gracefulRampDown: "10s",
    },
    [`${name}_150vu`]: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "2m0s",
      stages: [
        { duration: "20s", target: 150 },
        { duration: "70s", target: 150 },
      ],
      gracefulRampDown: "10s",
    },
    [`${name}_300vu`]: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "3m30s",
      stages: [
        { duration: "20s", target: 300 },
        { duration: "70s", target: 300 },
      ],
      gracefulRampDown: "10s",
    },
  };
}

const PROFILES = {
  smoke: {
    stages: [
      { duration: "30s", target: 3 },
    ],
    thresholds: {},
  },
  baseline: {
    stages: [
      { duration: "1m", target: 20 },
      { duration: "3m", target: 50 },
      { duration: "2m", target: 50 },
      { duration: "1m", target: 0 },
    ],
    thresholds: {
      http_req_failed: ["rate<0.05"],
      http_req_duration: ["p(95)<2000"],
    },
  },
  stress: {
    // scenarios is a function — call getStressScenarios(name) to get the object.
    // stages is left empty so callers that check profile.stages get a no-op.
    stages: [],
    thresholds: {
      http_req_failed: ["rate<0.10"],
      http_req_duration: ["p(95)<5000"],
    },
  },
};

export function getProfile() {
  const name = (__ENV.PROFILE || "smoke").toLowerCase();
  return PROFILES[name] || PROFILES.smoke;
}

/**
 * Return the options.scenarios block for the current profile.
 *
 * For smoke and baseline a single ramping-vus scenario is returned (identical
 * to the previous behaviour).  For stress, four named scenarios are returned so
 * that metrics are automatically segmented by concurrency level.
 *
 * @param {string} scenarioName  — the base name used in the benchmark's scenario
 *                                 (e.g. "auth_login", "posting_heavy")
 */
export function getScenarios(scenarioName) {
  const profileName = (__ENV.PROFILE || "smoke").toLowerCase();
  if (profileName === "stress") {
    return buildStressScenarios(scenarioName);
  }
  const profile = PROFILES[profileName] || PROFILES.smoke;
  return {
    [scenarioName]: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: profile.stages,
      gracefulRampDown: "10s",
    },
  };
}
