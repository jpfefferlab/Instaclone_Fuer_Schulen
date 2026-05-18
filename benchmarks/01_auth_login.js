/**
 * k6 Benchmark: Auth Login
 *
 * Tests authentication throughput — each VU logs in, fetches their profile,
 * then periodically re-fetches /api/users/me/.
 *
 * Resources created : benchmark users (setup)
 * Resources destroyed: benchmark users (teardown)
 *
 * Run:
 *   k6 run -e BASE_URL=http://localhost:80 -e PROFILE=smoke benchmarks/01_auth_login.js
 */

import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, getProfile, getScenarios } from "./lib/config.js";
import {
  login,
  authHeaders,
  tenantParams,
  setupUsers,
} from "./lib/helpers.js";
import http from "k6/http";

// Custom metrics
const loginDuration = new Trend("login_duration", true);
const profileDuration = new Trend("profile_duration", true);
const loginFailRate = new Rate("login_fail_rate");

const profile = getProfile();

export const options = {
  scenarios: getScenarios("auth_login"),
  thresholds: {
    login_duration: ["p(95)<800"],
    profile_duration: ["p(95)<400"],
    login_fail_rate: ["rate<0.01"],
    ...profile.thresholds,
  },
};

// ---------------------------------------------------------------------------
// Setup: read pre-created users from USERS_JSON env var (set by run_single.sh)
// ---------------------------------------------------------------------------

export function setup() {
  const users = setupUsers();
  console.log(`[setup] Ready with ${users.length} benchmark users`);
  return { users };
}

// ---------------------------------------------------------------------------
// Main VU function
// ---------------------------------------------------------------------------
export default function (data) {
  const users = data.users;
  if (!users || users.length === 0) {
    console.error("No benchmark users available");
    return;
  }

  // Each VU picks a user by its VU index (wrapping)
  const idx = (__VU - 1) % users.length;
  const u = users[idx];

  // 1. Login
  const loginStart = Date.now();
  const res = http.post(
    `${BASE_URL}/api/auth/login/`,
    JSON.stringify({ username: u.username, password: u.password }),
    tenantParams({ headers: { "Content-Type": "application/json" }, tags: { name: "login" } })
  );
  loginDuration.add(Date.now() - loginStart);
  const loginOk = check(res, {
    "login status 200": (r) => r.status === 200,
    "login has token": (r) => {
      const b = r.json();
      return !!(b.access_token || b.access);
    },
  });
  loginFailRate.add(!loginOk);

  if (!loginOk) return;

  const token = res.json().access_token || res.json().access;

  // 2. GET /api/users/me/
  const meStart = Date.now();
  const meRes = http.get(`${BASE_URL}/api/users/me/`, {
    headers: authHeaders(token),
    tags: { name: "profile_me" },
  });
  profileDuration.add(Date.now() - meStart);
  check(meRes, { "me status 200": (r) => r.status === 200 });

  sleep(1);
}

// ---------------------------------------------------------------------------
// Teardown: no-op — user deletion is handled by run_single.sh via docker exec
// ---------------------------------------------------------------------------
export function teardown(_data) {
  console.log("[teardown] Users will be cleaned up by the runner script");
}
