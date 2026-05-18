/**
 * k6 Benchmark: Likes / Comments / Meldungen (Reports)
 *
 * Simulates high-frequency engagement: liking posts, commenting,
 * and reporting posts for moderation.
 *
 * Setup creates users + seed posts.  VUs then like, comment, and report.
 * Teardown deletes all benchmark users (cascades likes/comments/reports).
 *
 * Run:
 *   k6 run -e BASE_URL=http://localhost:80 -e PROFILE=smoke benchmarks/03_likes_comments_reports.js
 */

import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { BASE_URL, getProfile, getScenarios, ADMIN_USER, ADMIN_PASS } from "./lib/config.js";
import {
  login,
  authHeaders,
  setupUsersWithTokens,
  createPost,
  likePost,
  unlikePost,
  createComment,
  deleteComment,
  reportPost,
} from "./lib/helpers.js";
import http from "k6/http";

const likeDuration = new Trend("like_duration", true);
const commentDuration = new Trend("comment_duration", true);
const reportDuration = new Trend("report_duration", true);
const engagementFailRate = new Rate("engagement_fail_rate");

const profile = getProfile();

export const options = {
  scenarios: getScenarios("engagement"),
  setupTimeout: "10m",
  thresholds: {
    like_duration: ["p(95)<400"],
    comment_duration: ["p(95)<500"],
    report_duration: ["p(95)<500"],
    engagement_fail_rate: ["rate<0.02"],
    ...profile.thresholds,
  },
};

const SEED_POSTS_PER_USER = 2;

export function setup() {
  const users = setupUsersWithTokens();
  console.log(`[setup] Ready with ${users.length} benchmark users`);

  // Each user creates some seed posts that others can like/comment/report
  const postIds = [];
  for (const u of users) {
    for (let i = 0; i < SEED_POSTS_PER_USER; i++) {
      const res = createPost(u.token, `Seed post ${i} from ${u.username} #k6bench`);
      if (res.status === 201) {
        postIds.push({ id: res.json().id, creatorId: u.id, creatorUsername: u.username });
      }
    }
  }
  console.log(`[setup] Created ${postIds.length} seed posts`);

  // Get teacher token for report listing (teacher-only endpoint)
  const teacherToken = login(ADMIN_USER, ADMIN_PASS);

  return { users, postIds, teacherToken };
}

export default function (data) {
  const { users, postIds, teacherToken } = data;
  if (!users || users.length === 0 || postIds.length === 0) return;

  const idx = (__VU - 1) % users.length;
  const u = users[idx];
  const hdrs = authHeaders(u.token);

  // Pick a random post that is NOT the current user's
  const otherPosts = postIds.filter((p) => p.creatorId !== u.id);
  if (otherPosts.length === 0) return;
  const targetPost = otherPosts[Math.floor(Math.random() * otherPosts.length)];

  // 1. Like the post
  const likeStart = Date.now();
  const likeRes = likePost(u.token, targetPost.id);
  likeDuration.add(Date.now() - likeStart);
  const likeOk = check(likeRes, {
    "like created": (r) => r.status === 201 || r.status === 400, // 400 = already liked
  });

  let likeId = null;
  if (likeRes.status === 201) {
    likeId = likeRes.json().id;
  }

  sleep(0.3);

  // 2. Comment on the post
  const commentStart = Date.now();
  const commentRes = createComment(
    u.token,
    targetPost.id,
    `Benchmark comment from VU${__VU} iter${__ITER}`
  );
  commentDuration.add(Date.now() - commentStart);
  const commentOk = check(commentRes, { "comment created 201": (r) => r.status === 201 });

  let commentId = null;
  if (commentRes.status === 201) {
    commentId = commentRes.json().id;
  }

  sleep(0.3);

  // 3. Report the post (Meldung)
  const reportStart = Date.now();
  const reportRes = reportPost(u.token, u.id, targetPost.id);
  reportDuration.add(Date.now() - reportStart);
  check(reportRes, {
    "report created": (r) => r.status === 201 || r.status === 400, // 400 = duplicate
  });

  engagementFailRate.add(
    !(likeOk && commentOk && (reportRes.status === 201 || reportRes.status === 400))
  );

  sleep(0.3);

  // 4. View report list as teacher (moderation flow)
  if (teacherToken) {
    const reportsRes = http.get(`${BASE_URL}/api/post-reports/?page=1`, {
      headers: authHeaders(teacherToken),
      tags: { name: "list_reports" },
    });
    check(reportsRes, { "reports list 200": (r) => r.status === 200 });
  }

  // 5. Cleanup: unlike and delete comment to allow repeated iterations
  if (likeId) {
    unlikePost(u.token, likeId);
  }
  if (commentId) {
    deleteComment(u.token, commentId);
  }

  sleep(0.5);
}

export function teardown(_data) {
  console.log("[teardown] Users will be cleaned up by the runner script");
}
