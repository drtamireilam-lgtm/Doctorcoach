# Workout completion summary

Development branch only. No remote schema changes, deployments, or user-data writes performed.

## Behavior

The existing finish action now opens a mobile-scrollable summary with completed exercise/sets and duration. Partial sessions remain explicit. Optional comparisons use only completed saved sets, exact exercise/unit/day, and prior completed sessions of the same plan mode and assignment ending before this session started. Maximum weight, maximum reps, and maximum supported RPE-adjusted e1RM are separate metrics; they need not come from the same set. The UI labels these as maxima and cautions that differences do not necessarily indicate stronger performance. No baseline/e1RM is invented for missing or unsupported data. No prescribed loads change.

The trainee reports pain after training explicitly (no preselected zero), optional overall effort 1–10 by half points, and an optional note up to 500 characters. Finish saves all fields in the same existing owner/version/status update. Server validation rejects malformed feedback without changing the session. Old clients can still finish without feedback. Completed-session retries return the original saved session and cannot overwrite feedback.

Only a completed server response displays “האימון נשמר”. Failure keeps the dialog values and shows an inline error. The saved screen links to history/progress and optionally the existing private review-video flow; it does not automatically upload, post, or send a message. Feedback is shown with historical workout context under existing owner/team-access controls.

## Required before deploying this code

**New migration: drizzle/0045_workout_finish_feedback.sql** adds nullable `finish_feedback_json` to `training_sessions`. Existing rows remain null. Source schema and migration journal updated.

Do not deploy the new Worker before applying this migration to the isolated staging DB. Do not apply to the old pilot or production. Preserve local standalone/wrangler.json while pulling.

Before any remote migration, export the staging D1 database to a local backup and verify that the export exists and restores successfully to an isolated local SQLite database. Check PRAGMA integrity_check and table counts against the export before continuing. Keep this backup private (it may contain account information). Check PRAGMA table_info(training_sessions) against the exact staging database ID `95f3a5fa-330f-4257-9e39-e8770fd71a53`; if the column already exists, do not repeat ALTER TABLE. Apply only migration 0045, not the full historical schema. Build/deploy the branch after migration success. No migration has been applied by this development turn.

## Validation

Full automated suite, TypeScript, standalone production build. Added real SQLite regression tests for atomic feedback persistence, owner isolation, retry immutability, invalid-payload rollback, old-client behavior and comparison baselines. Component tests use React element/test doubles to verify acknowledgment timing and retaining notes after failure. Actual browser layout, phone keyboard, saved-screen transition and private video upload remain pending isolated staging deployment and phone QA.
