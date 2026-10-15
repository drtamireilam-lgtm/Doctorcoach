# Workout readiness and pain context — 2026-10-08

Completes the data-linkage portion of audit item 3, ahead of next-workout progression.
The current-day readiness record (Israel calendar) is captured server-side in the
same SQL INSERT as the workout. It includes the record ID/version/date and sleep,
energy, perceived stress and note. Replaying a start request returns the original
snapshot. Later daily-record changes cannot rewrite past workouts; older workouts
remain explicitly without a readiness snapshot rather than being backfilled.

Optional 0–10 during-set pain is saved with set results, preserving absent versus
zero reports. Any recorded pain in the workout suppresses automatic next-set load
suggestions using the existing conservative pain rule. No thresholds for sleep,
energy, stress or medical clearance have been introduced.

Completed workouts accept a versioned next-day pain report beginning the next Israel
calendar day after completion. Later retrospective entry is labeled with the target
day and stored with its actual recording time. The authenticated owner and current
health consents are checked; updates do not change performed sets or workout status.
Stale writes return the current session. Updating older history preserves list order.
Next-workout suggestions also suppress load changes when during/next-day pain exists.

Readiness and all four pain timings appear in workout history and the assigned team's
set review. The active workout shows its starting context; per-set pain remains
visible in detailed review. CSV export includes during/next-day pain and readiness
metrics. Existing consent and connected-team visibility boundaries remain in force.

Schema: additive migration 0013_flashy_shen adds nullable readiness/followup JSON
columns. No backfill or destructive schema operation. Sites applies the migration
before deploying the Worker.

Validation covers server-owned snapshots, immutable retries, missing/older daily
records, pain persistence/validation and recommendation suppression, ownership,
consent, stale writes and Israel date boundaries, plus existing regression tests.
One older helper test revealed callers with a minimal session shape; next-workout
pain checks now fall back to the provided exercise in that case.
Real-device/browser acceptance and live-account clinical review remain unverified.

Next audit item: next-workout progression that preserves coach approval. Readiness
metrics are available for team judgment; automated clinical decision rules remain
undefined and are not inferred from the new data.
