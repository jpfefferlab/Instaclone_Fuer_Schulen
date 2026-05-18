/**
 * Shared helpers for k6 benchmark scripts.
 *
 * User creation strategy
 * ----------------------
 * There is no public signup endpoint on this API.  Users must be created
 * before the k6 test starts.  The runner scripts (run_single.sh / run_all.sh)
 * call a Django shell one-liner via `docker exec` to create users inside the
 * correct tenant schema and write their credentials as JSON.  That JSON is
 * passed to k6 via the USERS_JSON env var.  The k6 `setup()` function reads
 * it, logs every user in via the JWT endpoint, and returns the enriched array.
 * Teardown is a no-op in k6 — user deletion is done by the shell runner after
 * k6 exits (so users are always cleaned up even on crash).
 *
 * Tenant routing
 * --------------
 * The InstaClone backend uses django-tenants.  Every HTTP request must carry
 * a Host header that matches a registered tenant domain, otherwise the
 * middleware returns 404 before the view runs.
 *
 * The runner scripts derive BENCH_HOST from BASE_URL and pass it as an env
 * var.  This module injects it as a Host header on every request so that k6
 * hits the correct tenant schema.
 */

import http from "k6/http";
import encoding from "k6/encoding";
import { check } from "k6";
import { SharedArray } from "k6/data";
import { BASE_URL, ADMIN_USER, ADMIN_PASS } from "./config.js";
import { IMAGE_B64 } from "./image_b64.js";

// ---------------------------------------------------------------------------
// Tenant Host header
// ---------------------------------------------------------------------------

/**
 * The Host header value to send on every request.
 * Derived from BENCH_HOST env var (set by run_single.sh / run_all.sh from
 * BASE_URL).  Falls back to the host portion of BASE_URL itself.
 */
const BENCH_HOST =
  __ENV.BENCH_HOST ||
  BASE_URL.replace(/^https?:\/\//, "").split("/")[0];

/**
 * Return base HTTP params with Host header pre-set for tenant routing.
 * Merge with per-call params using Object.assign / spread.
 */
export function tenantParams(extra) {
  const params = extra ? Object.assign({}, extra) : {};
  params.headers = Object.assign({ Host: BENCH_HOST }, params.headers || {});
  return params;
}

// ---------------------------------------------------------------------------
// JWT authentication
// ---------------------------------------------------------------------------

/**
 * Login via the DRF auth endpoint and return the access token string.
 * Returns null on failure (logs a warning).
 */
export function login(username, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login/`,
    JSON.stringify({ username, password }),
    tenantParams({ headers: { "Content-Type": "application/json" }, tags: { name: "login" } })
  );
  if (res.status === 200) {
    const body = res.json();
    return body.access_token || body.access || null;
  }
  console.warn(`login failed for ${username}: HTTP ${res.status} — ${res.body}`);
  return null;
}

/**
 * Return standard JSON+auth headers for a JWT token, including the tenant
 * Host header.
 */
export function authHeaders(token) {
  return {
    Host: BENCH_HOST,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown helpers  (called from k6 setup() / teardown())
// ---------------------------------------------------------------------------

/**
 * Read the pre-created users JSON (from USERS_JSON env var) and return
 * the credentials array WITHOUT performing any HTTP calls.  Setup completes
 * instantly regardless of user count, so the k6 ramp stages are not eaten
 * by sequential logins.
 *
 * Use this in benchmarks where VUs log in themselves (e.g. 01_auth_login).
 *
 * Each entry returned: { id, username, password }
 */
export function setupUsers() {
  const usersJson = __ENV.USERS_JSON;
  if (!usersJson) {
    console.error(
      "USERS_JSON env var is not set.  Did you run the benchmark via run_single.sh?"
    );
    return [];
  }

  let rawUsers;
  try {
    rawUsers = JSON.parse(usersJson);
  } catch (e) {
    console.error(`Failed to parse USERS_JSON: ${e}`);
    return [];
  }

  console.log(`[setup] Loaded ${rawUsers.length} benchmark users (credentials only — VUs will log in)`);
  return rawUsers;
}

/**
 * Read USERS_JSON, login every user sequentially, and enrich each entry with
 * a live JWT token and numeric settingsId (via GET /api/users/me/).
 *
 * Use this in benchmarks whose setup() needs tokens to create fixtures
 * (posts, ads, etc.) before VUs start — NOT for high-VU-count benchmarks
 * where setup time would eat into ramp stages.
 *
 * Returns an array of { id, username, password, token, settingsId } objects.
 */
export function setupUsersWithTokens() {
  const usersJson = __ENV.USERS_JSON;
  if (!usersJson) {
    console.error(
      "USERS_JSON env var is not set.  Did you run the benchmark via run_single.sh?"
    );
    return [];
  }

  let rawUsers;
  try {
    rawUsers = JSON.parse(usersJson);
  } catch (e) {
    console.error(`Failed to parse USERS_JSON: ${e}`);
    return [];
  }

  // ---------------------------------------------------------------------------
  // Batch logins: send all login requests in parallel using http.batch().
  // This replaces the old sequential loop and cuts setup time from O(N) serial
  // round-trips to a small number of parallel batches — critical for remote
  // clusters where N can be 300+ and each RTT is tens of milliseconds.
  // ---------------------------------------------------------------------------
  const BATCH_SIZE = 25; // tune: larger = fewer round-trips but more server load
  const loginUrl = `${BASE_URL}/api/auth/login/`;
  const loginParams = tenantParams({
    headers: { "Content-Type": "application/json" },
    tags: { name: "setup_login" },
  });

  const tokens = new Array(rawUsers.length).fill(null);

  for (let i = 0; i < rawUsers.length; i += BATCH_SIZE) {
    const batch = rawUsers.slice(i, i + BATCH_SIZE).map((u) => [
      "POST",
      loginUrl,
      JSON.stringify({ username: u.username, password: u.password }),
      loginParams,
    ]);
    const responses = http.batch(batch);
    responses.forEach((res, j) => {
      const u = rawUsers[i + j];
      if (res.status === 200) {
        const body = res.json();
        tokens[i + j] = body.access_token || body.access || null;
      } else {
        console.warn(`login failed for ${u.username}: HTTP ${res.status}`);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Batch /api/users/me/ calls to fetch settingsId, also in parallel.
  // ---------------------------------------------------------------------------
  const meUrl = `${BASE_URL}/api/users/me/`;
  const users = [];
  const indexMap = []; // maps batch slot → rawUsers index

  for (let i = 0; i < rawUsers.length; i += BATCH_SIZE) {
    const slice = rawUsers.slice(i, i + BATCH_SIZE);
    const batch = [];
    const sliceIndexMap = [];

    slice.forEach((u, j) => {
      const globalIdx = i + j;
      const token = tokens[globalIdx];
      if (!token) return;
      batch.push([
        "GET",
        meUrl,
        null,
        { headers: authHeaders(token), tags: { name: "setup_me" } },
      ]);
      sliceIndexMap.push(globalIdx);
    });

    if (batch.length === 0) continue;

    const responses = http.batch(batch);
    responses.forEach((res, k) => {
      const globalIdx = sliceIndexMap[k];
      const u = rawUsers[globalIdx];
      const token = tokens[globalIdx];
      let id = u.id;
      let settingsId = null;
      if (res.status === 200) {
        const me = res.json();
        id = me.id || u.id;
        if (me.settings && me.settings.id) {
          settingsId = me.settings.id;
        }
      }
      users.push({ id, username: u.username, password: u.password, token, settingsId });
    });
  }

  console.log(`[setup] Logged in ${users.length}/${rawUsers.length} benchmark users (batched)`);
  return users;
}

// ---------------------------------------------------------------------------
// Convenience wrappers for common API calls
// ---------------------------------------------------------------------------

/**
 * Create a post.  Uses image.png (RGB JPEG) as the default image.
 */
export function createPost(token, caption, contentBase64) {
  // The backend expects a multipart/form-data upload with the image binary in
  // the `content_upload` field (Django FileField).  Sending base64 JSON to a
  // read-only `content` property is silently ignored and produces posts with no
  // image.  k6 FormData encodes the base64 data URI as a file part so Django
  // receives it as a proper uploaded file.
  const img = contentBase64 || IMAGE_B64;

  // Decode the base64 data URI to raw bytes for the multipart part.
  // k6's http.file() accepts a binary string / ArrayBuffer as the file body.
  // Strip the "data:image/jpeg;base64," prefix if present, then pass raw b64
  // — k6 will encode it correctly as an octet-stream part.
  const b64data = img.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");

  const formData = {
    content_upload: http.file(encoding.b64decode(b64data, "std", "b"), "post.jpg", "image/jpeg"),
    caption: caption || "benchmark post #k6bench",
    tags: "[]",
  };

  const params = {
    headers: {
      Host: BENCH_HOST,
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type manually — k6 sets it with the correct boundary
      // when the body is a plain object (multipart).
    },
    tags: { name: "create_post" },
  };

  const res = http.post(`${BASE_URL}/api/posts/`, formData, params);
  if (res.status !== 201) {
    console.error(`createPost failed: HTTP ${res.status} — ${res.body}`);
  }
  return res;
}

export function deletePost(token, postId) {
  return http.del(`${BASE_URL}/api/posts/${postId}/`, null, {
    headers: authHeaders(token),
    tags: { name: "delete_post" },
  });
}

export function likePost(token, postId) {
  return http.post(
    `${BASE_URL}/api/likes/`,
    JSON.stringify({ post: postId }),
    { headers: authHeaders(token), tags: { name: "like_post" } }
  );
}

export function unlikePost(token, likeId) {
  return http.del(`${BASE_URL}/api/likes/${likeId}/`, null, {
    headers: authHeaders(token),
    tags: { name: "unlike_post" },
  });
}

export function createComment(token, postId, content) {
  return http.post(
    `${BASE_URL}/api/comments/`,
    JSON.stringify({ post: postId, content: content || "k6 benchmark comment" }),
    { headers: authHeaders(token), tags: { name: "create_comment" } }
  );
}

export function deleteComment(token, commentId) {
  return http.del(`${BASE_URL}/api/comments/${commentId}/`, null, {
    headers: authHeaders(token),
    tags: { name: "delete_comment" },
  });
}

export function followUser(token, userId) {
  return http.post(
    `${BASE_URL}/api/followings/`,
    JSON.stringify({ following_user: userId }),
    { headers: authHeaders(token), tags: { name: "follow_user" } }
  );
}

export function unfollowUser(token, followingId) {
  return http.del(`${BASE_URL}/api/followings/${followingId}/`, null, {
    headers: authHeaders(token),
    tags: { name: "unfollow_user" },
  });
}

export function getFeed(token, page) {
  return http.get(`${BASE_URL}/api/feed/?page=${page || 1}`, {
    headers: authHeaders(token),
    tags: { name: "get_feed" },
  });
}

export function reportPost(token, reporterId, postId) {
  return http.post(
    `${BASE_URL}/api/post-reports/`,
    JSON.stringify({ reporter_id: reporterId, post_id: postId }),
    { headers: authHeaders(token), tags: { name: "report_post" } }
  );
}

export function createAdvertisement(token, caption, url, interests) {
  const img = IMAGE_B64;
  return http.post(
    `${BASE_URL}/api/advertisements/`,
    JSON.stringify({
      content: img,
      caption: caption || "Benchmark ad",
      url: url || "https://example.com",
      interests: interests || "sports,music",
      tags: "[]",
    }),
    { headers: authHeaders(token), tags: { name: "create_advertisement" } }
  );
}

export function updateUserSettings(token, settingsId, settings) {
  return http.patch(
    `${BASE_URL}/api/user-settings/${settingsId}/`,
    JSON.stringify(settings),
    { headers: authHeaders(token), tags: { name: "update_settings" } }
  );
}

export function getAnalytics(token) {
  return http.get(`${BASE_URL}/api/analytics/`, {
    headers: authHeaders(token),
    tags: { name: "get_analytics" },
  });
}
