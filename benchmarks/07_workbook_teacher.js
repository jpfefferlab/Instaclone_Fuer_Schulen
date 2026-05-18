/**
 * k6 Benchmark: Workbook — Lehrer Seite (Teacher Page)
 *
 * Simulates teacher workflows:
 *   - Creating workbook sections, exercises, and tasks.
 *   - Reviewing student submissions.
 *   - Viewing moderation reports.
 *   - Restricting/unrestricting users.
 *
 * This benchmark requires a teacher/staff account.
 *
 * Setup:
 *   - Creates benchmark student users who will have submissions to review.
 *   - Creates a workbook section → exercise → tasks.
 *   - Students submit answers so the teacher has data to review.
 * VUs:
 *   - Each VU acts as the teacher: lists sections, reviews exercises,
 *     checks submissions, views reports, restricts/unrestricts users.
 * Teardown:
 *   - Deletes benchmark users and workbook fixtures.
 *
 * Run:
 *   k6 run -e BASE_URL=http://localhost:80 -e PROFILE=smoke benchmarks/07_workbook_teacher.js
 */

import { check, sleep, group } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, ADMIN_USER, ADMIN_PASS, getProfile, getScenarios } from "./lib/config.js";
import {
  login,
  authHeaders,
  setupUsersWithTokens,
} from "./lib/helpers.js";
import http from "k6/http";

const sectionListDuration = new Trend("section_list_duration", true);
const exerciseDetailDuration = new Trend("exercise_detail_duration", true);
const submissionReviewDuration = new Trend("submission_review_duration", true);
const restrictDuration = new Trend("restrict_user_duration", true);
const teacherFailRate = new Rate("teacher_fail_rate");

const profile = getProfile();

export const options = {
  scenarios: getScenarios("workbook_teacher"),
  setupTimeout: "10m",
  thresholds: {
    section_list_duration: ["p(95)<600"],
    exercise_detail_duration: ["p(95)<600"],
    submission_review_duration: ["p(95)<700"],
    restrict_user_duration: ["p(95)<700"],
    teacher_fail_rate: ["rate<0.02"],
    ...profile.thresholds,
  },
};

export function setup() {
  const teacherToken = login(ADMIN_USER, ADMIN_PASS);
  if (!teacherToken) {
    console.error("Cannot login as teacher");
    return { teacherToken: null, users: [], sectionId: null, exerciseIds: [], taskIds: [] };
  }

  // Read pre-created benchmark student users
  const users = setupUsersWithTokens();
  console.log(`[setup] Ready with ${users.length} student users`);

  // Create a workbook section with exercises and tasks
  const hdrs = authHeaders(teacherToken);

  const sectionRes = http.post(
    `${BASE_URL}/api/workbook/sections/`,
    JSON.stringify({ title: "K6 Benchmark Section", order: 999 }),
    { headers: hdrs, tags: { name: "setup_create_section" } }
  );

  let sectionId = null;
  const exerciseIds = [];
  const taskIds = [];

  if (sectionRes.status === 201) {
    sectionId = sectionRes.json().id;
    // Note: exercises are read-only nested in SectionSerializer — they cannot
    // be created via the REST API. We discover existing exercises below.
  }

  // Get existing sections to find exercises/tasks we can work with
  const sectionsRes = http.get(`${BASE_URL}/api/workbook/sections/`, {
    headers: hdrs,
    tags: { name: "setup_get_sections" },
  });

  let existingExerciseIds = [];
  let existingTaskIds = [];
  if (sectionsRes.status === 200) {
    const sections = sectionsRes.json();
    // sections could be paginated (results array) or direct array
    const sectionList = sections.results || sections;
    for (const sec of sectionList) {
      if (sec.exercises) {
        for (const ex of sec.exercises) {
          existingExerciseIds.push(ex.id);
          if (ex.tasks) {
            for (const t of ex.tasks) {
              existingTaskIds.push({ id: t.id, type: t.type, options: t.options || [] });
            }
          }
        }
      }
    }
  }

  // Students submit answers to existing tasks
  for (let i = 0; i < users.length && i < existingTaskIds.length; i++) {
    const u = users[i];
    const task = existingTaskIds[i % existingTaskIds.length];

    if (task.type === "MULTIPLE_CHOICE" && task.options.length > 0) {
      http.post(
        `${BASE_URL}/api/workbook/submissions/multiple-choice/`,
        JSON.stringify({
          task_id: task.id,
          choices: [task.options[0].id],
        }),
        { headers: authHeaders(u.token), tags: { name: "setup_mc_submit" } }
      );
    } else if (task.type === "TEXT_ANSWER") {
      http.post(
        `${BASE_URL}/api/workbook/submissions/text-answer/`,
        JSON.stringify({
          task_id: task.id,
          answer: "Benchmark answer from k6 student",
        }),
        { headers: authHeaders(u.token), tags: { name: "setup_text_submit" } }
      );
    }
  }

  return {
    teacherToken,
    users,
    sectionId,
    exerciseIds: existingExerciseIds,
    taskIds: existingTaskIds,
  };
}

export default function (data) {
  const { teacherToken, users, exerciseIds, taskIds } = data;
  if (!teacherToken) return;

  const hdrs = authHeaders(teacherToken);

  group("teacher_workbook", function () {
    // 1. List all sections
    const secStart = Date.now();
    const secRes = http.get(`${BASE_URL}/api/workbook/sections/`, {
      headers: hdrs,
      tags: { name: "list_sections" },
    });
    sectionListDuration.add(Date.now() - secStart);
    check(secRes, { "sections 200": (r) => r.status === 200 });

    sleep(0.3);

    // 2. View exercise detail (if any exist)
    if (exerciseIds.length > 0) {
      const exId = exerciseIds[__ITER % exerciseIds.length];
      const exStart = Date.now();
      const exRes = http.get(`${BASE_URL}/api/workbook/exercises/${exId}/`, {
        headers: hdrs,
        tags: { name: "exercise_detail" },
      });
      exerciseDetailDuration.add(Date.now() - exStart);
      check(exRes, { "exercise 200": (r) => r.status === 200 });
    }

    sleep(0.3);

    // 3. Review student submissions for a task
    if (taskIds.length > 0) {
      const task = taskIds[__ITER % taskIds.length];
      const subStart = Date.now();
      const subRes = http.get(
        `${BASE_URL}/api/workbook/submissions/${task.id}/`,
        { headers: hdrs, tags: { name: "review_submission" } }
      );
      submissionReviewDuration.add(Date.now() - subStart);
      check(subRes, {
        "submission 200 or 404": (r) => r.status === 200 || r.status === 404,
      });
    }
  });

  group("teacher_moderation", function () {
    // 4. List reports
    const reportsRes = http.get(`${BASE_URL}/api/post-reports/?page=1`, {
      headers: hdrs,
      tags: { name: "list_reports" },
    });
    check(reportsRes, { "reports 200": (r) => r.status === 200 });

    // 5. Restrict and unrestrict a student
    if (users.length > 0) {
      const targetUser = users[__ITER % users.length];
      const restStart = Date.now();
      const restRes = http.post(
        `${BASE_URL}/api/restricted-users/restrict/`,
        JSON.stringify({ user_id: targetUser.id }),
        { headers: hdrs, tags: { name: "restrict_user" } }
      );
      restrictDuration.add(Date.now() - restStart);

      const restOk = check(restRes, {
        "restrict 200/201": (r) => r.status === 200 || r.status === 201,
      });
      teacherFailRate.add(!restOk);

      sleep(0.2);

      // Unrestrict immediately
      http.post(
        `${BASE_URL}/api/restricted-users/unrestrict/`,
        JSON.stringify({ user_id: targetUser.id }),
        { headers: hdrs, tags: { name: "unrestrict_user" } }
      );
    }
  });

  sleep(1);
}

export function teardown(data) {
  // Delete the benchmark section if we created one
  if (data.sectionId && data.teacherToken) {
    http.del(`${BASE_URL}/api/workbook/sections/${data.sectionId}/`, null, {
      headers: authHeaders(data.teacherToken),
      tags: { name: "teardown_delete_section" },
    });
  }
  console.log("[teardown] Users will be cleaned up by the runner script");
}
