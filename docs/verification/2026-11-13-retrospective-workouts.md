# Retrospective workouts — review candidate

Base: PR74 head c58ac66977b37834ac84a4270b05772ec622da20. Feature branch: feat/retrospective-workouts-20261113. Stacked on PR74 to preserve its localization fixes without changing its branch.

## Behavior
- Shared HE/EN screen in My Program and Progress: current-program copy or free library/private free-text workout.
- Past/current Israel date, explicit optional duration and separate recording timestamp.
- Optional reps/time, kg, RPE and pain remain unknown when omitted; no coach targets are copied into performed results.
- Multiple occurrences and per-set original targets retained; adding/replacing/removing performed exercises never edits the prescribed plan.
- Includes cardio with explicitly unknown duration, without inventing timer measurements.
- Private owner-only server draft with request identity and version concurrency protection, explicit reload and non-destructive program-context refresh.
- Server warning for an actual same-day completed entry; user acknowledgement is offered after that warning. Repeated identical submit is idempotent; changed reuse fails.
- Canonical history, coach row decoders, weekly reports, CSV and performance analytics include performed-date records; missing values stay gaps.

## Verification
- 191 focused tests pass, including 12 new regression/acceptance cases. Command: `node --experimental-strip-types --test tests/retrospective-workout.test.mjs tests/training.test.mjs tests/set-load.test.mjs tests/workout-finish.test.mjs tests/weekly-progress.test.mjs tests/workout-export.test.mjs tests/performance.test.mjs tests/coach-assignment.test.mjs tests/account-deletion.test.mjs tests/staff-review-queue.test.mjs tests/cardio.test.mjs tests/cardio-progress.test.mjs tests/progress-timeline.test.mjs tests/coach-workspaces.test.mjs tests/workout-experience.test.mjs tests/program-progression.test.mjs tests/training-access.test.mjs tests/approved-team-permissions.test.mjs tests/services.test.mjs tests/localization.test.mjs`.
- TypeScript `tsc --noEmit` passes; ESLint on five new TS/TSX files passes without suppressions.
- Standalone build passes; existing import-optimization/route-classification warnings remain disclosed, not rewritten.
- Ad hoc real React 19.2.6 + jsdom27.4.0 + disposable SQLite interaction checks pass in Hebrew and English: free log → private draft → reload → completed history; null values, program copy, immutable targets, actual duplicate warning.
- Browser matrix harness: `node --experimental-strip-types scripts/retrospective-workout-browser.mjs` for Chromium HE/EN at320/390/430/768/1363; `DC_ENGINES=chromium,webkit` enables both engines when installed.
- Browser acceptance is BLOCKED here: system Chromium cannot create required Unix socket in managed workspace; WebKit executable absent. No passing screenshot, geometry or physical iPhone/Safari result is claimed. The harness exists but its width matrix did not run.

## Migration and release gate
Source migration0061 adds a nullable session metadata column, owner/versioned draft table and deletion barriers. Schema declarations and account export/deletion include drafts. No remote SQL was executed. Existing LAB has not received this schema or feature. Obtain exact-source migration/deployment approval and validate schema/backup conditions separately. Code rollback retains additive data; do not drop records automatically. Merge, remote migration and deployment are excluded from this change's authorization.

## Scope
This implements the approved retrospective-workout feature and related workflow UI. Broader Smart Import redesign and a full-app visual redesign were not performed. Program copy uses the current authorized prescription and says so; it does not reconstruct past assignment history. Detailed cardio-only metrics beyond duration and RPE remain available through the existing live cardio workflow, not inferred here.
