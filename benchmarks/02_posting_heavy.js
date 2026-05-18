/**
 * k6 Benchmark: Posting Heavy
 *
 * Simulates users creating posts with images, tagging, and refreshing
 * their newsfeed to test write-path throughput and read-after-write.
 *
 * Resources created : benchmark users + posts (setup creates users; VUs create posts)
 * Resources destroyed: benchmark users (teardown — cascade deletes posts)
 *
 * Run:
 *   k6 run -e BASE_URL=http://localhost:80 -e PROFILE=smoke benchmarks/02_posting_heavy.js
 */

import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { BASE_URL, getProfile, getScenarios } from "./lib/config.js";
import {
  setupUsersWithTokens,
  authHeaders,
  createPost,
  deletePost,
  getFeed,
} from "./lib/helpers.js";
import http from "k6/http";

const postCreateDuration = new Trend("post_create_duration", true);
const feedRefreshDuration = new Trend("feed_refresh_duration", true);
const postFailRate = new Rate("post_fail_rate");
const postsCreated = new Counter("posts_created");

const profile = getProfile();

export const options = {
  scenarios: getScenarios("posting_heavy"),
  setupTimeout: "10m",
  thresholds: {
    post_create_duration: ["p(95)<1500"],
    feed_refresh_duration: ["p(95)<1000"],
    post_fail_rate: ["rate<0.01"],
    ...profile.thresholds,
  },
};

export function setup() {
  const users = setupUsersWithTokens();
  console.log(`[setup] Ready with ${users.length} benchmark users`);

  // Ensure each user has a fresh token
  return { users };
}

export default function (data) {
  const users = data.users;
  if (!users || users.length === 0) return;

  const idx = (__VU - 1) % users.length;
  const u = users[idx];
  const hdrs = authHeaders(u.token);

  // 1. Create a post
  const caption = `Benchmark post from VU ${__VU} iter ${__ITER} #k6bench #load`;
  const postStart = Date.now();
  const postRes = createPost(u.token, caption);
  postCreateDuration.add(Date.now() - postStart);

  const postOk = check(postRes, {
    "post created 201": (r) => r.status === 201,
  });
  postFailRate.add(!postOk);

  let postId = null;
  if (postOk) {
    postsCreated.add(1);
    postId = postRes.json().id;
  }

  sleep(0.5);

  // 2. Refresh feed (read-after-write)
  const feedStart = Date.now();
  const feedRes = getFeed(u.token, 1);
  feedRefreshDuration.add(Date.now() - feedStart);
  check(feedRes, { "feed status 200": (r) => r.status === 200 });

  // 3. Fetch page 2
  const feed2Res = getFeed(u.token, 2);
  check(feed2Res, { "feed page 2 status 200": (r) => r.status === 200 });

  // 4. Optionally delete the post to avoid unbounded growth during long runs
  if (postId && __ITER % 3 === 0) {
    deletePost(u.token, postId);
  }

  sleep(1);
}

export function teardown(_data) {
  console.log("[teardown] Users will be cleaned up by the runner script");
}
