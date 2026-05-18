/**
 * k6 Benchmark: Personalized Advertisements
 *
 * Tests advertisement creation (teacher) and feed retrieval with
 * targeted ads injected based on user profile attributes (age, gender,
 * interests).
 *
 * Setup:
 *   - Creates benchmark users with varied profiles (age, gender, interests).
 *   - Teacher creates several targeted advertisements.
 * VUs:
 *   - Load the newsfeed (ads are injected per user's ad_frequency setting).
 *   - Scroll multiple pages to trigger ad-mixing logic.
 * Teardown:
 *   - Deletes benchmark users (cascade) and ads.
 *
 * Run:
 *   k6 run -e BASE_URL=http://localhost:80 -e PROFILE=smoke benchmarks/04_personalized_ads.js
 */

import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, ADMIN_USER, ADMIN_PASS, getProfile, getScenarios } from "./lib/config.js";
import {
  login,
  authHeaders,
  setupUsersWithTokens,
  createPost,
  createAdvertisement,
  getFeed,
  updateUserSettings,
} from "./lib/helpers.js";
import { IMAGE_B64 } from "./lib/image_b64.js";
import http from "k6/http";

const feedWithAdsDuration = new Trend("feed_with_ads_duration", true);
const adCreateDuration = new Trend("ad_create_duration", true);
const adFailRate = new Rate("ad_fail_rate");

const profile = getProfile();

export const options = {
  scenarios: getScenarios("personalized_ads"),
  setupTimeout: "10m",
  thresholds: {
    feed_with_ads_duration: ["p(95)<1200"],
    ad_fail_rate: ["rate<0.02"],
    ...profile.thresholds,
  },
};

// Profile variations for ad targeting
const PROFILES = [
  { age: 16, gender: "MALE", interests: "sports,gaming" },
  { age: 17, gender: "FEMALE", interests: "music,fashion" },
  { age: 15, gender: "OTHER", interests: "science,technology" },
  { age: 18, gender: "MALE", interests: "music,sports" },
  { age: 14, gender: "FEMALE", interests: "art,photography" },
];

export function setup() {
  const users = setupUsersWithTokens();
  console.log(`[setup] Ready with ${users.length} benchmark users`);

  // Update user profiles with varied demographics.
  // settingsId is already populated by setupUsersWithTokens() via GET /api/users/me/
  // so we skip the extra round-trip and use u.id / u.settingsId directly.
  for (let i = 0; i < users.length; i++) {
    const prof = PROFILES[i % PROFILES.length];
    const u = users[i];
    http.put(
      `${BASE_URL}/api/users/${u.id}/`,
      JSON.stringify({
        first_name: `Bench`,
        last_name: `User${i}`,
        profile: {
          age: prof.age,
          gender: prof.gender,
          interests: prof.interests,
          bio: "k6 benchmark user",
        },
      }),
      { headers: authHeaders(u.token), tags: { name: "setup_update_profile" } }
    );

    // Set ad frequency to 3 (inject an ad every 3 posts)
    if (u.settingsId) {
      updateUserSettings(u.token, u.settingsId, {
        newsfeed_advertisement_frequency: 3,
      });
    }
  }

  // Teacher creates targeted advertisements
  const teacherToken = login(ADMIN_USER, ADMIN_PASS);
  const adIds = [];
  if (teacherToken) {
    const ads = [
      { caption: "Sports gear sale! #ad", interests: "sports", gender: "MALE" },
      { caption: "Music festival tickets #ad", interests: "music", gender: null },
      { caption: "Fashion trends 2025 #ad", interests: "fashion", gender: "FEMALE" },
      { caption: "Tech gadgets review #ad", interests: "technology,science", gender: null },
      { caption: "Art supplies discount #ad", interests: "art,photography", gender: "FEMALE" },
    ];
    for (const ad of ads) {
      const img = IMAGE_B64;
      const res = http.post(
        `${BASE_URL}/api/advertisements/`,
        JSON.stringify({
          content: img,
          caption: ad.caption,
          url: "https://example.com/ad",
          interests: ad.interests,
          gender: ad.gender || "",
          tags: "[]",
        }),
        { headers: authHeaders(teacherToken), tags: { name: "setup_create_ad" } }
      );
      if (res.status === 201) {
        adIds.push(res.json().id);
      }
    }
    console.log(`[setup] Created ${adIds.length} advertisements`);

    // Also create some seed posts so the feed has content
    for (let i = 0; i < 15; i++) {
      createPost(teacherToken, `Seed content post ${i} #k6bench #content`);
    }
  }

  return { users, adIds, teacherToken };
}

export default function (data) {
  const { users } = data;
  if (!users || users.length === 0) return;

  const idx = (__VU - 1) % users.length;
  const u = users[idx];

  // Scroll through 3 pages of the feed — ads should be injected
  for (let page = 1; page <= 3; page++) {
    const start = Date.now();
    const res = getFeed(u.token, page);
    feedWithAdsDuration.add(Date.now() - start);

    const ok = check(res, {
      [`feed page ${page} status 200`]: (r) => r.status === 200,
    });
    adFailRate.add(!ok);

    sleep(0.5);
  }

  // Also list advertisements endpoint
  const adsRes = http.get(`${BASE_URL}/api/advertisements/`, {
    headers: authHeaders(u.token),
    tags: { name: "list_ads" },
  });
  check(adsRes, { "ads list 200": (r) => r.status === 200 });

  sleep(1);
}

export function teardown(_data) {
  // Delete ads created by teacher
  if (_data.teacherToken && _data.adIds) {
    for (const adId of _data.adIds) {
      http.del(`${BASE_URL}/api/posts/${adId}/`, null, {
        headers: authHeaders(_data.teacherToken),
        tags: { name: "teardown_delete_ad" },
      });
    }
  }
  console.log("[teardown] Users will be cleaned up by the runner script");
}
