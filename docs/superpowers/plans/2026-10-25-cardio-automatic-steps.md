# Cardio and automatic steps implementation plan

> Use superpowers:subagent-driven-development. Owner approved design and autonomous implementation on 2026-10-25. Implement independent domain/backend/native tasks with disjoint file ownership; integrate UI and review the whole branch here. No further planning approval gate.

**Goal:** Integrate cardio into current programs/workouts and real automatic daily steps through native health adapters.
**Architecture:** Extend existing D1 training models; add separate granular activity consent and replacement daily snapshots. Native wrapper reuses authenticated web UI and steps-only platform aggregations.
**Tech stack:** TypeScript, React, D1/SQLite, existing Worker, Swift HealthKit, Kotlin Health Connect.
**Spec:** ../specs/2026-10-25-cardio-automatic-steps-design.md (approved).

## Global constraints

No production deployment, main merge, remote migration, fabricated activity, unrelated anatomy/import/canonical matching/OAuth edits, or real-device claims. Preserve training safety/owner/coach guards. No default medical step prescription. Existing clone and feature branch are isolated; reuse them.

## Review focus

- Completed cardio must not enter strength set/load/e1RM statistics.
- No readable data is distinct from observed zero; source corrections can reduce totals.
- Revocation and account switching reject queued snapshots; coach sharing is opt-in per coach.
- Repeated session actions and sync uploads are idempotent and versioned.
- Timezone/DST days use explicit platform windows; missing activity never becomes invented activity.

## Task 1: Cardio domain and existing training integration

Files: new lib/cardio.ts, lib/cardio-player.ts, drizzle/0053_cardio.sql, tests/cardio*.test.mjs; modify training.ts, training-store.ts, care.ts, weekly-progress.ts and pertinent server parsers only. Do not edit UI.

Interfaces: PlanItem.cardio?: CardioPrescription; exerciseId `cardio:<activityId>`; cardio has activityId, mode, targets (durationSeconds/distanceMeters/paceSeconds/speedKph/inclinePercent/resistance/cadence/heartRate/rpe/poolLengthMeters), intervals. SessionExercise.cardioResult?: CardioExecution. New action `cardio` on existing patch uses `command: start|pause|resume|checkpoint|finish|recover`, occurrenceId, exerciseId, actionId. Return same TrainingSession.

- [ ] Write domain and SQLite training tests for all 15 types, invalid metrics, mixed/cardio-only plans, immutable prescription, pause/resume/refresh, versions/ownership and report counts.
- [ ] Run tests red, implement bounded validated models, additive persistence, assigned-item parsing, snapshot/player actions and modality-separated weekly metrics.
- [ ] Run new tests and baseline training/weekly/day regressions; commit only owned files.

## Task 2: Secure activity backend

Files: lib/activity.ts, lib/activity-store.ts, app/api/activity/route.ts, drizzle/0054_activity.sql, tests/activity*.test.mjs. Do not edit training or UI.

Interface GET /api/activity returns {connection: {id,platform,status,timezone,lastSyncAt,version}|null, days: [{date,timezone,steps:number|null,observedAt,partial}], goal:{dailyTarget:number|null,weeklyTarget:number|null,version}|null, shares:[], summary:{today:number|null,weeklyAverage:number|null,observedDays:number}}. GET `?clientId=` only authorized scoped coach, default owner. POST actions `connect` (platform, timezone, explicit consent true), `disconnect`, `sync` (connectionId,generation,revision,days), `goal` (dailyTarget,weeklyTarget,version), `share` (coachEmail,steps,cardio,heartRate,version). Connection includes generation. Never accepts owner identity from body.

- [ ] Write SQLite integration tests for owner/coach boundary, missing/zero, corrections, repeats, stale revisions, mismatched payload, source switching, revoked connections, per-coach grants, consent races, DST and invalid windows.
- [ ] Implement separate source consent, atomic guarded updates, strictly validated source snapshots and effective goal history; step totals remain replacement aggregates.
- [ ] Run integration tests and commit owned files; document limitations honestly.

## Task 3: Native adapters and wrapper

Files: mobile/** and docs/mobile-activity.md only. API contract from Task 2. Thin native WKWebView/Android WebView shells pin approved origin/main frame and steps command allowlist. No auth/OAuth rewrite. Foreground web API uses current cookies; background credentials must remain account bound and cannot be invented. If full background account binding cannot be implemented securely, provide adapter and explicit blocker rather than unsafe token storage.

- [ ] Read official platform documentation; implement steps-only HealthKit cumulative daily aggregation and Health Connect aggregate, permission/availability and background primitives.
- [ ] Supply app/build/privacy/capability scaffolding, secure origin checks, platform window/provenance contract, no-data semantics, account/logout handling, and native tests where tooling exists.
- [ ] Record exact native compilation/device blockers, setup and device acceptance matrix; commit only owned files.

## Task 4: UI integration and analytics

Files: new components/cardio-editor.tsx, cardio-player.tsx, activity-dashboard.tsx, activity-progress.tsx; modify hooks/use-training.ts, training-workspace.tsx, trainee-simple.tsx, coach builders, weekly report view, localization/styles as needed.

- [ ] Add cardio picker/targets/interval editor inside current My Program and coach editors; relevant metrics only, existing day IDs.
- [ ] Render persistent cardio execution using existing server session and actions, separate completed/prescribed values, explicit interrupted-gap recovery; no invented time.
- [ ] Home steps connection/goal/sharing card and existing Progress/weekly views; no new top-level tabs, bilingual and directional layout.
- [ ] Verify UI/browser and meaningful integration regressions.

## Task 5: Verification, review and delivery

- [ ] Run full unit/integration suite, root suite, typecheck, lint, normal build, isolated LAB build, disposable Worker smoke and browser checks; capture exact counts/exits.
- [ ] Independent review of each domain and whole branch; fix real findings, rerun affected checks.
- [ ] Commit, push feature branch, create draft PR (authorized), attach PR. No merge or deployment.
- [ ] Detailed Hebrew report with PASS/PARTIAL/BLOCKED/FAIL/NOT TESTED, exact evidence, native blockers, LAB status and next actions.

## Decision ledger

Ruling: Approval includes thin native wrapper and single authoritative source as proposed. Timer does not silently infer activity during uncertain refresh/process-death gaps; app-internal navigation preserves server state. Background scheduling remains best-effort and platform-specific. Product UI must label unavailable native capability accurately.

Baseline: main 818e4ce; documentation commit d94ef8d; 24 targeted training/weekly/day tests pass with Node --test-isolation=none (default child-process spawning blocked by sandbox). No complete baseline build yet. All independent implementers share the isolated checkout with strict file ownership; commits may not stage unrelated files.
