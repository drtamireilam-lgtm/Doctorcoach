# Workout experience workstream — 13 November 2026

## Baseline and implemented delta

Inspected PR75 source `e376c91399600cf1274cb159af35876b2728c2ba`, preserving its private retrospective drafts, owner checks, optimistic concurrency, idempotent completion, missing-value semantics, immutable prescription snapshots and additive migration 0061. The original implementation accepts a calendar date only and anchors history at Jerusalem midnight. Active workout field changes require an explicit set/save action.

Implemented optional actual workout time (`HH:mm`) in Israel time. IANA `Asia/Jerusalem` conversion preserves summer/winter offsets, rejects nonexistent spring clock times, requires first/second occurrence selection for autumn repeated times and rejects future instants. Date-only entries remain valid and explicitly have unknown `performedAt`; midnight remains their legacy history sorting anchor. `retrospective.performedAt` is the actual UTC instant when supplied, `time` retains the wall-clock input and `timeZone` records its zone. Immutable `recordedAt` remains creation time. No existing history is rewritten. Typed server error codes provide actionable Hebrew/English DST validation. No schema migration beyond PR75's existing additive migration is introduced.

Duplicate warnings continue to inspect the complete performed calendar date, even if the new entry includes a late time; changing the lower bound from the entry's performed instant to local day start prevents missing earlier same-day workouts. Same-request time changes conflict with the stored fingerprint; successful retries remain idempotent.

Active strength-set fields now autosave valid changes after 900ms without user edits. Autosave uses the existing authenticated, versioned set mutation, preserves the saved `done` state and disables automatic next-load application. Explicit set completion, next-load application and manual save remain available. Invalid intermediate input stays unsaved. Existing finish/unload dirty guards remain until server confirmation. The existing global mutation lock serializes requests; the optional `onStarted` callback marks attempts only after acquiring that lock, so another row's busy request does not incorrectly consume an attempt. No local-storage copies or sensitive cross-account caches are added.

A review found that a conflict response could merge an unrelated saved field, change the attempted signature and cause a retry of stale local input. Autosave now blocks after an acquired failed request until an explicit local field edit or successful manual save. Server synchronization alone cannot unblock it. The failure message persists across merged signatures. Browser-workstream DOM timer regression evidence is recorded separately.

## Verification executed here

- `node --experimental-strip-types --test tests/retrospective-time.test.mjs tests/retrospective-workout.test.mjs tests/set-autosave.test.mjs tests/workout-write-races.test.mjs tests/set-load.test.mjs`: **50/50 passed**, rerun after the review's UI-only retry guard correction.
- Subsequent focused retrospective/time/autosave invocation: **18/18 passed** after typed validation errors and conversion refinement.
- New tests exercise winter/summer and midnight-crossing conversion, both DST transitions, future-time rejection, date-only unknown time, separate immutable creation clock, whole-day duplicate detection, idempotency/time conflicts, decimal autosave persistence, unchanged completion and stale version rejection.
- TypeScript completed successfully after the retry guard correction; final aggregate verification is owned by the coordinator.
- ESLint on new/retrospective domain/component/API files passed. Broader active-workout files retain the preexisting `hooks/use-training.ts:63` `react-hooks/set-state-in-effect` error and preexisting unused/dependency warnings. The new autosave dependency warning was corrected. No suppression was introduced.

## Boundaries and risks

No remote migration, deploy, merge, provider operation, real identity, real trainee/patient data or production change. Browser rendering and physical iPhone/Safari are not claimed by these Node/SQLite tests. Active autosave waits for valid complete field values and a pause in editing; closing before server confirmation may lose pending input and remains guarded. Failed autosave requires an explicit edit/manual save; it does not repeatedly retry stale data in the background. This is field autosave for strength sets, not a new cardio persistence mechanism; existing cardio checkpoint logic remains.
