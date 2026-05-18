/**
 * k6 Benchmark: Analytics Dashboard
 *
 * Tests the GET /api/analytics/ endpoint under load.
 * This endpoint aggregates totals (students, posts, stories, likes,
 * comments), profile details, posts with hashtags, and hashtag counts.
 * It is expected to be heavier than simple CRUD endpoints because it
 * performs multiple aggregation queries.
 *
 * Setup:
 *   - Creates benchmark users + seed content to make analytics realistic.
 * VUs:
 *   - Repeatedly fetch the analytics endpoint.
 * Teardown:
 *   - Deletes benchmark users.
 *
 * Run:
 *   k6 run -e BASE_URL=http://localhost:80 -e PROFILE=smoke benchmarks/06_analytics_dashboard.js
 */

import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, ADMIN_USER, ADMIN_PASS, getProfile, getScenarios } from "./lib/config.js";
import {
  login,
  authHeaders,
  setupUsersWithTokens,
  createPost,
  likePost,
  createComment,
  getAnalytics,
} from "./lib/helpers.js";
import http from "k6/http";

const analyticsDuration = new Trend("analytics_duration", true);
const analyticsFailRate = new Rate("analytics_fail_rate");

const profile = getProfile();

export const options = {
  scenarios: getScenarios("analytics"),
  setupTimeout: "10m",
  thresholds: {
    analytics_duration: ["p(95)<2000"],
    analytics_fail_rate: ["rate<0.02"],
    ...profile.thresholds,
  },
};

export function setup() {
  const users = setupUsersWithTokens();
  console.log(`[setup] Ready with ${users.length} benchmark users`);

  // Seed some content so analytics has data to aggregate
  const teacherToken = login(ADMIN_USER, ADMIN_PASS);
  if (teacherToken) {
    const postIds = [];
    for (let i = 0; i < 10; i++) {
      const res = createPost(
        teacherToken,
        `Analytics seed post ${i} #k6bench #analytics #tag${i % 5}`
      );
      if (res.status === 201) postIds.push(res.json().id);
    }
    // Add engagement
    for (let i = 0; i < Math.min(users.length, postIds.length); i++) {
      likePost(users[i].token, postIds[i % postIds.length]);
      createComment(users[i].token, postIds[i % postIds.length], `analytics comment ${i}`);
    }
    console.log(`[setup] Seeded ${postIds.length} posts with engagement`);
  }

  return { users };
}

export default function (data) {
  const { users } = data;
  if (!users || users.length === 0) return;

  const idx = (__VU - 1) % users.length;
  const u = users[idx];

  // Fetch analytics
  const start = Date.now();
  const res = getAnalytics(u.token);
  analyticsDuration.add(Date.now() - start);

  const ok = check(res, {
    "analytics 200": (r) => r.status === 200,
    "has total_student_count": (r) => r.json().total_student_count !== undefined,
    "has total_post_count": (r) => r.json().total_post_count !== undefined,
  });
  analyticsFailRate.add(!ok);

  sleep(2);
}

export function teardown(_data) {
  console.log("[teardown] Users will be cleaned up by the runner script");
}
