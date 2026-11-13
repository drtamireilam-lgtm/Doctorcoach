import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { platform, client, coach } from "./platform-db.mjs";
import { defaultPrescription } from "../lib/training.ts";
import { parseRetrospectiveWorkout } from "../lib/retrospective-workout.ts";
import { retrospectiveWorkoutStore } from "../lib/retrospective-workout-store.ts";
import { performancePoints } from "../lib/performance.ts";
import { weeklyProgress } from "../lib/weekly-progress.ts";
const input = () => ({
  requestId: randomUUID(),
  version: 0,
  source: "free",
  date: "2026-10-20",
  durationMinutes: null,
  before: null,
  after: null,
  note: "",
  exercises: [
    {
      id: randomUUID(),
      exerciseId: "goblet",
      name: "",
      sets: [{ done: true, amount: 8, weight: 33.125, actualRpe: 7 }],
    },
  ],
});
const now = new Date("2026-11-13T10:00:00Z");
test("parser preserves unknown values and validates real Israel dates, not UTC today", () => {
  const p = input();
  p.exercises[0].sets[0] = {
    done: true,
    amount: null,
    weight: null,
    actualRpe: null,
  };
  const r = parseRetrospectiveWorkout(p, [], now);
  assert.equal(r.items[0].results[0].amount, null);
  assert.equal(r.items[0].results[0].weight, null);
  assert.equal(r.before, null);
  for (const date of ["2026-02-30", "2026-11-14", "bad"])
    assert.throws(() => parseRetrospectiveWorkout({ ...p, date }, [], now));
  assert.doesNotThrow(() =>
    parseRetrospectiveWorkout(
      { ...p, date: "2026-11-14" },
      [],
      new Date("2026-11-13T23:00:00Z"),
    ),
  );
  for (const weight of [-1, 1001, Infinity, "12"])
    assert.throws(() =>
      parseRetrospectiveWorkout(
        {
          ...p,
          exercises: [
            { ...p.exercises[0], sets: [{ done: true, amount: 8, weight }] },
          ],
        },
        [],
        now,
      ),
    );
});
test("plan occurrences preserve original prescriptions and allow performed replacement, addition and omission", () => {
  const plan = [
    { ...defaultPrescription("goblet"), occurrenceId: "a", targetRpe: 8 },
    { ...defaultPrescription("goblet"), occurrenceId: "b", targetRpe: 9 },
  ];
  const p = {
    ...input(),
    source: "program",
    dayId: "1",
    exercises: [
      {
        ...input().exercises[0],
        sourceOccurrenceId: "b",
        exerciseId: "wall-slide",
      },
      {
        id: randomUUID(),
        name: "תרגיל אישי",
        exerciseId: null,
        sets: [{ done: true, amount: null, weight: null }],
      },
    ],
  };
  const r = parseRetrospectiveWorkout(p, plan, now);
  assert.equal(r.items[0].exerciseId, "wall-slide");
  assert.equal(r.prescription[0].targetRpe, 8);
  assert.equal(r.prescription[1].targetRpe, 9);
  assert.equal(r.items[0].targetRpe, null);
  assert.equal(plan[1].exerciseId, "goblet");
  assert.throws(() =>
    parseRetrospectiveWorkout(
      {
        ...p,
        exercises: [{ ...p.exercises[0], sourceOccurrenceId: "unknown" }],
      },
      plan,
      now,
    ),
  );
});
test("completed logs sort by performed date; unknown values do not produce estimates or pain reports", async (t) => {
  const f = platform(t, { now: now.toISOString() });
  await f.connect();
  const s = retrospectiveWorkoutStore(f.db);
  const p = input();
  p.exercises[0].sets.push({
    done: true,
    amount: null,
    weight: null,
    actualRpe: null,
  });
  const saved = await s.submit(client.userId, p);
  assert.equal(saved.retrospective.recordedAt, now.toISOString());
  assert.equal(saved.retrospective.durationMinutes, null);
  assert.equal(saved.before, null);
  assert.equal(saved.status, "completed");
  assert.equal(saved.items[0].results[0].weight, 33.125);
  const feed = await f.training.feed(client.userId);
  assert.equal(feed.history[0].id, saved.id);
  assert.equal(feed.stats.week, 0);
  assert.equal(feed.stats.sets, 2);
  const points = performancePoints(feed.history, "goblet");
  assert.equal(points[0].weight, 33.125);
  const summary = weeklyProgress(feed.history, [], "2026-10-18").current;
  assert.equal(summary.workoutPain.before.reported, 0);
  assert.equal(summary.volume, 265);
  assert.equal((await f.training.feed("stranger")).history.length, 0);
  assert.equal((await s.submit(client.userId, p)).id, saved.id);
  await assert.rejects(
    () => s.submit(client.userId, { ...p, note: "changed" }),
    (e) => e.status === 409,
  );
});
test("same-day warning requires explicit acknowledgement and drafts are owner scoped with optimistic concurrency", async (t) => {
  const f = platform(t, { now: now.toISOString() });
  await f.connect();
  const s = retrospectiveWorkoutStore(f.db),
    p = input();
  const draft = await s.saveDraft(client.userId, p);
  assert.equal(draft.version, 1);
  assert.equal((await s.load("stranger")).draft, null);
  await assert.rejects(
    () => s.saveDraft(client.userId, p),
    (e) => e.status === 409,
  );
  const saved = await s.submit(client.userId, { ...p, version: 1 });
  assert.equal((await s.load(client.userId)).draft, null);
  const duplicate = input();
  await assert.rejects(
    () => s.submit(client.userId, duplicate),
    (e) => e.status === 409,
  );
  assert.notEqual(
    (
      await s.submit(client.userId, {
        ...duplicate,
        acknowledgeDuplicate: true,
      })
    ).id,
    saved.id,
  );
});
test("stale program drafts and revoked consent cannot publish; free logs do not change coach plans or active workout", async (t) => {
  const f = platform(t, { now: now.toISOString() });
  await f.connect();
  const plan = {
    id: randomUUID(),
    title: "תוכנית אימון",
    items: [{ ...defaultPrescription("goblet"), targetRpe: 8 }],
  };
  await f.care.assign(coach, client.userId, plan);
  const s = retrospectiveWorkoutStore(f.db),
    ctx = await s.load(client.userId),
    p = {
      ...input(),
      source: "program",
      programToken: ctx.programToken,
      programId: ctx.programId,
      dayId: "1",
    };
  p.exercises[0].sourceOccurrenceId = ctx.plan[0].occurrenceId;
  const active = await f.training.start(client.userId, {
    requestId: randomUUID(),
    before: 0,
  });
  const saved = await s.submit(client.userId, p);
  assert.equal(saved.retrospective.prescription[0].targetRpe, 8);
  assert.equal((await f.training.feed(client.userId)).active.id, active.id);
  assert.equal((await f.training.getPlan(client.userId))[0].targetRpe, 8);
  f.sql
    .prepare(
      "UPDATE user_consents SET accepted=0 WHERE user_id='client' AND consent_id='health'",
    )
    .run();
  await assert.rejects(
    () => s.submit(client.userId, { ...input(), acknowledgeDuplicate: true }),
    (e) => e.status === 403,
  );
});
test("all-unknown performed sets stay gaps in estimates, CSV and summaries", async (t) => {
  const { workoutFinishSummary } = await import("../lib/workout-finish.ts");
  const { workoutExportCsv } = await import("../lib/workout-export.ts");
  const f = platform(t, { now: now.toISOString() });
  await f.connect();
  const p = input();
  p.exercises[0].sets = [
    { done: true, amount: null, weight: null, actualRpe: null },
  ];
  const saved = await retrospectiveWorkoutStore(f.db).submit(client.userId, p);
  assert.equal(workoutFinishSummary(saved, []).volumeKg, null);
  assert.deepEqual(workoutFinishSummary(saved, []).comparisons[0].current, {
    weight: null,
    reps: null,
    estimate: null,
  });
  assert.equal(performancePoints([saved], "goblet")[0].e1rm, null);
  assert.equal(performancePoints([saved], "goblet")[0].weight, null);
  const line = workoutExportCsv([saved]).split("\n")[1];
  assert.ok(!line.includes("null"));
  assert.ok(!line.includes("undefined"));
});
test("weekly report store preserves unknown pain; date display and export use the performed calendar date", async (t) => {
  const { weeklyProgressStore } =
    await import("../lib/weekly-progress-store.ts");
  const { formatDate } = await import("../lib/training.ts");
  const { workoutExportRows } = await import("../lib/workout-export.ts");
  const f = platform(t, { now: now.toISOString() });
  await f.connect();
  const p = input();
  const s = await retrospectiveWorkoutStore(f.db).submit(client.userId, p);
  assert.equal(
    (
      await weeklyProgressStore(f.db).report(
        client,
        client.userId,
        "2026-10-18",
      )
    ).current.workoutPain.before.reported,
    0,
  );
  assert.equal(workoutExportRows([s])[1][0], "2026-10-20");
  assert.equal(
    formatDate(s.startedAt),
    new Intl.DateTimeFormat("he-IL", {
      timeZone: "Asia/Jerusalem",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(s.startedAt)),
  );
});
test("stale tab cannot overwrite a new draft after the previous draft is submitted", async (t) => {
  const f = platform(t, { now: now.toISOString() });
  await f.connect();
  const s = retrospectiveWorkoutStore(f.db),
    a = input(),
    b = input();
  await s.saveDraft(client.userId, a);
  await s.submit(client.userId, { ...a, version: 1 });
  await s.saveDraft(client.userId, b);
  await assert.rejects(
    () => s.saveDraft(client.userId, { ...a, version: 1, note: "stale tab" }),
    (e) => e.status === 409,
  );
  assert.equal((await s.load(client.userId)).draft.requestId, b.requestId);
  await assert.rejects(
    () => s.saveDraft(client.userId, a),
    (e) => e.status === 409,
  );
});
test("cardio-only program logging retains unknown duration and repeated legacy occurrences stay separate", () => {
  const plan = [
    defaultPrescription("cardio:walking"),
    defaultPrescription("goblet"),
    defaultPrescription("goblet"),
  ];
  const p = {
    ...input(),
    source: "program",
    dayId: "1",
    exercises: [
      {
        ...input().exercises[0],
        exerciseId: "cardio:walking",
        sourceOccurrenceId: "1:cardio:walking",
        sets: [{ done: true, amount: null, weight: null, actualRpe: null }],
      },
      { ...input().exercises[0], sourceOccurrenceId: "1:goblet:2" },
    ],
  };
  const r = parseRetrospectiveWorkout(p, plan, now);
  assert.equal(r.items[0].cardioResult.status, "completed");
  assert.equal(r.items[0].cardioResult.metrics.durationSeconds, undefined);
  assert.equal(r.items[1].occurrenceId, "1:goblet:2");
});
test("explicit null set targets and missing cardio duration are never filled from defaults", async (t) => {
  const { performedCardioSeconds } = await import("../lib/cardio.ts");
  const { cardioProgress } = await import("../lib/cardio-progress.ts");
  const f = platform(t, { now: now.toISOString() });
  await f.connect();
  const p = {
    ...input(),
    exercises: [
      {
        ...input().exercises[0],
        exerciseId: "cardio:walking",
        sets: [{ done: true, amount: null, weight: null, actualRpe: null }],
      },
    ],
  };
  const saved = await retrospectiveWorkoutStore(f.db).submit(client.userId, p);
  assert.equal(performedCardioSeconds(saved.items[0].cardioResult), null);
  assert.equal(
    weeklyProgress([saved], [], "2026-10-18").current.cardio.minutes,
    null,
  );
  const plan = [
    {
      ...defaultPrescription("goblet"),
      occurrenceId: "a",
      targetRpe: 8,
      targetRpes: [null, 9],
    },
  ];
  const r = parseRetrospectiveWorkout(
    {
      ...input(),
      source: "program",
      exercises: [
        {
          ...input().exercises[0],
          sourceOccurrenceId: "a",
          sets: [
            { done: true, amount: 8, weight: 20, actualRpe: 7 },
            { done: false, amount: null, weight: null },
          ],
        },
      ],
    },
    plan,
    now,
  );
  assert.equal(r.items[0].targetRpes[0], null);
  assert.equal(r.items[0].targetRpes[1], 9);
});
test("overnight live workout completed on the performed date triggers the duplicate warning", async (t) => {
  const f = platform(t, { now: now.toISOString() });
  await f.connect();
  await f.training.savePlan(client.userId, defaultPrescription("goblet"));
  const s = await f.training.start(client.userId, {
    requestId: randomUUID(),
    before: 0,
  });
  f.sql
    .prepare(
      "UPDATE training_sessions SET status='completed',started_at='2026-10-19T20:30:00.000Z',finished_at='2026-10-19T22:30:00.000Z' WHERE id=?",
    )
    .run(s.id);
  await assert.rejects(
    () => retrospectiveWorkoutStore(f.db).submit(client.userId, input()),
    (e) => e.status === 409 && e.code === "duplicate_workout",
  );
});
test("program changes after draft creation and revocation during commit cannot save a historical record", async (t) => {
  const f = platform(t, { now: now.toISOString() });
  await f.connect();
  await f.training.savePlan(client.userId, defaultPrescription("goblet"));
  const store = retrospectiveWorkoutStore(f.db),
    ctx = await store.load(client.userId);
  const p = {
    ...input(),
    source: "program",
    dayId: "1",
    programId: ctx.programId,
    programToken: ctx.programToken,
    exercises: [
      { ...input().exercises[0], sourceOccurrenceId: ctx.plan[0].occurrenceId },
    ],
  };
  await store.saveDraft(client.userId, p);
  await f.training.savePlan(client.userId, {
    ...defaultPrescription("goblet"),
    sets: 5,
  });
  await assert.rejects(
    () => store.submit(client.userId, { ...p, version: 1 }),
    (e) => e.status === 409,
  );
  assert.equal((await store.load(client.userId)).draft.requestId, p.requestId);
  const batch = f.db.batch.bind(f.db);
  f.db.batch = async (statements) => {
    f.sql
      .prepare(
        "UPDATE user_consents SET accepted=0 WHERE user_id='client' AND consent_id='health'",
      )
      .run();
    return batch(statements);
  };
  await assert.rejects(
    () => store.submit(client.userId, { ...input(), version: 1 }),
    (e) => e.status === 409,
  );
  assert.equal((await f.training.feed(client.userId)).history.length, 0);
});

test("actual workout time is retained separately from creation and duplicate checks still cover the whole date", async (t) => {
  const f = platform(t, { now: now.toISOString() });
  await f.connect();
  const store = retrospectiveWorkoutStore(f.db);
  const p = { ...input(), time: "19:45" };
  const saved = await store.submit(client.userId, p);
  assert.equal(saved.startedAt, "2026-10-20T16:45:00.000Z");
  assert.equal(saved.retrospective.performedAt, saved.startedAt);
  assert.equal(saved.retrospective.recordedAt, now.toISOString());
  assert.equal(saved.retrospective.timeZone, "Asia/Jerusalem");
  assert.equal(saved.retrospective.time, "19:45");
  await assert.rejects(() => store.submit(client.userId, {...input(), time: "08:00"}), e => e.code === "duplicate_workout");
  const next = await store.submit(client.userId, {...input(), time: "08:00", acknowledgeDuplicate: true});
  assert.notEqual(next.id, saved.id);
  assert.equal((await store.submit(client.userId, p)).id, saved.id);
  await assert.rejects(() => store.submit(client.userId, {...p, time: "19:46"}), e => e.status === 409);
});
