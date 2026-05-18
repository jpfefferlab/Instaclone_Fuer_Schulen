/**
 * k6 Benchmark: Compare News Feed Algorithms
 *
 * Tests the three newsfeed algorithms side by side:
 *   ALGORITHM_1 — Time-based (newest first)
 *   ALGORITHM_2 — Popularity-based (most likes)
 *   ALGORITHM_3 — EdgeRank (affinity x popularity x time_decay)
 *
 * Setup:
 *   - Creates benchmark users, assigns each to one of the 3 algorithms.
 *   - Creates seed posts with varying like/comment counts to differentiate
 *     algorithm outputs.
 * VUs:
 *   - Each VU scrolls 3 feed pages using their assigned algorithm.
 * Teardown:
 *   - Deletes benchmark users.
 *
 * Run:
 *   k6 run -e BASE_URL=http://localhost:80 -e PROFILE=smoke benchmarks/05_newsfeed_algorithms.js
 */

import { check, sleep, group } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, ADMIN_USER, ADMIN_PASS, getProfile, getScenarios } from "./lib/config.js";
import {
  login,
  authHeaders,
  setupUsersWithTokens,
  createPost,
  likePost,
  createComment,
  updateUserSettings,
  getFeed,
} from "./lib/helpers.js";


const algo1Duration = new Trend("algo1_time_based_duration", true);
const algo2Duration = new Trend("algo2_popularity_duration", true);
const algo3Duration = new Trend("algo3_edgerank_duration", true);
const feedFailRate = new Rate("feed_fail_rate");

const profile = getProfile();

export const options = {
  scenarios: getScenarios("newsfeed_compare"),
  setupTimeout: "10m",
  thresholds: {
    algo1_time_based_duration: ["p(95)<800"],
    algo2_popularity_duration: ["p(95)<1000"],
    algo3_edgerank_duration: ["p(95)<1500"],
    feed_fail_rate: ["rate<0.02"],
    ...profile.thresholds,
  },
};

const ALGORITHMS = ["ALGORITHM_1", "ALGORITHM_2", "ALGORITHM_3"];

export function setup() {
  const users = setupUsersWithTokens();
  console.log(`[setup] Ready with ${users.length} benchmark users`);

  // Assign algorithms evenly and update settings.
  // settingsId is already populated by setupUsersWithTokens() via GET /api/users/me/
  // so we do not need an extra round-trip here.
  for (let i = 0; i < users.length; i++) {
    const algo = ALGORITHMS[i % 3];
    users[i].algorithm = algo;

    if (users[i].settingsId) {
      updateUserSettings(users[i].token, users[i].settingsId, {
        newsfeed_algorithm: algo,
      });
    }
  }

  // Create seed posts with different engagement levels
  const teacherToken = login(ADMIN_USER, ADMIN_PASS);
  if (teacherToken) {
    // Create 20 posts
    const seedPostIds = [];
    for (let i = 0; i < 20; i++) {
      const res = createPost(
        teacherToken,
        `Seed post ${i} for newsfeed benchmark #k6bench #post${i}`
      );
      if (res.status === 201) {
        seedPostIds.push(res.json().id);
      }
    }

    // Add varying engagement: first posts get more likes/comments
    for (let i = 0; i < seedPostIds.length && i < users.length; i++) {
      const postId = seedPostIds[i % seedPostIds.length];
      // Some users like posts
      likePost(users[i].token, postId);
      if (i % 2 === 0) {
        createComment(users[i].token, postId, `Seed comment from ${users[i].username}`);
      }
    }

    console.log(`[setup] Created ${seedPostIds.length} seed posts with engagement`);
  }

  return { users };
}

export default function (data) {
  const { users } = data;
  if (!users || users.length === 0) return;

  const idx = (__VU - 1) % users.length;
  const u = users[idx];
  const algo = u.algorithm || "ALGORITHM_1";

  // Select the correct metric trend
  const metric =
    algo === "ALGORITHM_1"
      ? algo1Duration
      : algo === "ALGORITHM_2"
      ? algo2Duration
      : algo3Duration;

  group(`newsfeed_${algo}`, function () {
    for (let page = 1; page <= 3; page++) {
      const start = Date.now();
      const res = getFeed(u.token, page);
      metric.add(Date.now() - start);

      const ok = check(res, {
        [`${algo} page ${page} 200`]: (r) => r.status === 200,
      });
      feedFailRate.add(!ok);

      sleep(0.3);
    }
  });

  sleep(1);
}

export function teardown(_data) {
  console.log("[teardown] Users will be cleaned up by the runner script");
}
