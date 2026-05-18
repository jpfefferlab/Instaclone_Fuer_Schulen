/**
 * k6 Benchmark: Workbook — Schueler Seite (Student Page)
 *
 * Simulates student workflows:
 *   - Browsing workbook sections and exercises.
 *   - Viewing task details.
 *   - Submitting multiple-choice, text-answer, and interactive tasks.
 *   - Checking their own submissions.
 *   - Claiming points and unlocking features.
 *
 * Setup:
 *   - Creates benchmark student users.
 *   - Identifies available workbook content (sections/exercises/tasks).
 * VUs:
 *   - Each VU browses the workbook and submits answers.
 * Teardown:
 *   - Deletes benchmark users (cascades submissions, points, features).
 *
 * Run:
 *   k6 run -e BASE_URL=http://localhost:80 -e PROFILE=smoke benchmarks/08_workbook_student.js
 */

import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { BASE_URL, ADMIN_USER, ADMIN_PASS, getProfile, getScenarios } from "./lib/config.js";
import {
  login,
  authHeaders,
  setupUsersWithTokens,
} from "./lib/helpers.js";
import http from "k6/http";

const sectionBrowseDuration = new Trend("section_browse_duration", true);
const exerciseBrowseDuration = new Trend("exercise_browse_duration", true);
const submissionDuration = new Trend("submission_duration", true);
const pointsDuration = new Trend("points_duration", true);
const studentFailRate = new Rate("student_fail_rate");
const submissionsCount = new Counter("submissions_created");

const profile = getProfile();

export const options = {
  scenarios: getScenarios("workbook_student"),
  setupTimeout: "10m",
  thresholds: {
    section_browse_duration: ["p(95)<600"],
    exercise_browse_duration: ["p(95)<600"],
    submission_duration: ["p(95)<700"],
    points_duration: ["p(95)<400"],
    student_fail_rate: ["rate<0.02"],
    ...profile.thresholds,
  },
};

export function setup() {
  const users = setupUsersWithTokens();
  console.log(`[setup] Ready with ${users.length} student users`);

  // Discover existing workbook content
  const teacherToken = login(ADMIN_USER, ADMIN_PASS);
  let exercises = [];
  let tasks = [];
  let features = [];

  if (teacherToken) {
    const sectionsRes = http.get(`${BASE_URL}/api/workbook/sections/`, {
      headers: authHeaders(teacherToken),
    });
    if (sectionsRes.status === 200) {
      const data = sectionsRes.json();
      const sectionList = data.results || data;
      for (const sec of sectionList) {
        if (sec.exercises) {
          for (const ex of sec.exercises) {
            exercises.push({ id: ex.id, title: ex.title });
            if (ex.tasks) {
              for (const t of ex.tasks) {
                tasks.push({
                  id: t.id,
                  type: t.type,
                  exerciseId: ex.id,
                  options: t.options || [],
                  points: t.points || 0,
                  correct_answer: t.correct_answer,
                  action_type: t.action_type,
                  target_count: t.target_count,
                });
              }
            }
          }
        }
      }
    }

    // Get available features
    const featRes = http.get(`${BASE_URL}/api/features/`, {
      headers: authHeaders(teacherToken),
    });
    if (featRes.status === 200) {
      const fData = featRes.json();
      features = (fData.results || fData) || [];
    }
  }

  console.log(
    `[setup] Found ${exercises.length} exercises, ${tasks.length} tasks, ${features.length} features`
  );

  return { users, exercises, tasks, features };
}

export default function (data) {
  const { users, exercises, tasks, features } = data;
  if (!users || users.length === 0) return;

  const idx = (__VU - 1) % users.length;
  const u = users[idx];
  const hdrs = authHeaders(u.token);

  group("browse_workbook", function () {
    // 1. List sections
    const secStart = Date.now();
    const secRes = http.get(`${BASE_URL}/api/workbook/sections/`, {
      headers: hdrs,
      tags: { name: "student_list_sections" },
    });
    sectionBrowseDuration.add(Date.now() - secStart);
    check(secRes, { "sections 200": (r) => r.status === 200 });

    sleep(0.3);

    // 2. Open an exercise
    if (exercises.length > 0) {
      const ex = exercises[__ITER % exercises.length];
      const exStart = Date.now();
      const exRes = http.get(`${BASE_URL}/api/workbook/exercises/${ex.id}/`, {
        headers: hdrs,
        tags: { name: "student_exercise_detail" },
      });
      exerciseBrowseDuration.add(Date.now() - exStart);
      check(exRes, { "exercise 200": (r) => r.status === 200 });
    }
  });

  group("submit_answers", function () {
    if (tasks.length === 0) return;

    // Pick a task for this iteration (rotate through available tasks)
    const task = tasks[(__ITER + idx) % tasks.length];
    let submissionRes = null;

    const subStart = Date.now();
    if (task.type === "MULTIPLE_CHOICE" && task.options.length > 0) {
      // Submit a random choice
      const choiceId = task.options[Math.floor(Math.random() * task.options.length)].id;
      submissionRes = http.post(
        `${BASE_URL}/api/workbook/submissions/multiple-choice/`,
        JSON.stringify({ task_id: task.id, choices: [choiceId] }),
        { headers: hdrs, tags: { name: "submit_mc" } }
      );
    } else if (task.type === "TEXT_ANSWER") {
      submissionRes = http.post(
        `${BASE_URL}/api/workbook/submissions/text-answer/`,
        JSON.stringify({
          task_id: task.id,
          answer: `K6 student answer from VU${__VU} iter${__ITER}`,
        }),
        { headers: hdrs, tags: { name: "submit_text" } }
      );
    } else if (task.type === "INTERACTIVE") {
      submissionRes = http.post(
        `${BASE_URL}/api/workbook/submissions/interactive/`,
        JSON.stringify({
          task_id: task.id,
          action_type: task.action_type || "CREATE_POST",
          target_count: task.target_count || 1,
          current_count: 0,
        }),
        { headers: hdrs, tags: { name: "submit_interactive" } }
      );
    }

    if (submissionRes) {
      submissionDuration.add(Date.now() - subStart);
      const ok = check(submissionRes, {
        "submission success": (r) =>
          r.status === 201 || r.status === 200 || r.status === 400, // 400 = already submitted
      });
      studentFailRate.add(
        !(submissionRes.status === 201 || submissionRes.status === 200 || submissionRes.status === 400)
      );
      if (submissionRes.status === 201) {
        submissionsCount.add(1);
      }
    }

    sleep(0.3);

    // 3. Check own submissions
    if (exercises.length > 0) {
      const ex = exercises[__ITER % exercises.length];
      http.get(`${BASE_URL}/api/workbook/user-submissions/?exercise_id=${ex.id}`, {
        headers: hdrs,
        tags: { name: "student_my_submissions" },
      });
    }
  });

  group("rewards", function () {
    // 4. Check points
    const ptsStart = Date.now();
    const ptsRes = http.get(`${BASE_URL}/api/user/points/`, {
      headers: hdrs,
      tags: { name: "student_points" },
    });
    pointsDuration.add(Date.now() - ptsStart);
    check(ptsRes, { "points 200": (r) => r.status === 200 });

    // 5. List features
    http.get(`${BASE_URL}/api/user/features/`, {
      headers: hdrs,
      tags: { name: "student_features" },
    });

    // 6. Try to unlock a feature (may fail if not enough points — that's okay)
    if (features.length > 0) {
      const feat = features[__ITER % features.length];
      http.post(
        `${BASE_URL}/api/features/unlock/`,
        JSON.stringify({ feature_name: feat.name }),
        { headers: hdrs, tags: { name: "student_unlock_feature" } }
      );
    }
  });

  sleep(1);
}

export function teardown(_data) {
  console.log("[teardown] Users will be cleaned up by the runner script");
}
