# Isolated LAB schema preparation — 19 October 2026

Continuation after approved PR #18 merge (3f6161950c69c430e68f3cd55f5273ceec94c7a1). Application code is unchanged by this documentation commit. This push can trigger the existing Cloudflare LAB build if its watched branch has been saved as main. It does not establish a successful deployment.

## User-operated Cloudflare console evidence

The user is operating Safari; the agent has no authenticated Cloudflare CLI/browser session. Screenshots identify Worker doctorcoach-isolated-staging, DC_DEPLOYMENT_ENV=isolated-staging, DB bound to doctorcoach-isolated-staging and BUCKET bound to doctorcoach-isolated-staging. Previously active Worker version shown: 8538304e, approximately 17 hours old, built from test/fullapp-live-staging-20261015. Live GitHub revision after deployment still needs verification.

Initial schema showed seven legacy palette IDs, no custom_json, no program_items.occurrence_id and no media_assets.occurrence_id. Existing unique index program_owner_exercise_day and deletion guards were inspected. The D1 console returned a Time Travel bookmark before mutation; it is retained in the owner conversation.

User executed the staged manual equivalent of migrations 0050–0052:
- Created appearance_preferences_expanded with yellow and neutral added to the CHECK constraint.
- Copied all five original fields; original and expanded counts both returned 2. An EXCEPT comparison returned zero differences.
- Renamed original to appearance_preferences_backup_20261019, preserving it rather than dropping it; renamed expanded to appearance_preferences.
- Created equivalent insert/update account-deletion barriers on the active table with _v2 trigger names. The old triggers remain attached to the backup.
- Added custom_json TEXT and both nullable occurrence_id TEXT columns.
- Created program_owner_occurrence on owner_id + COALESCE(occurrence_id,day_id||':'||exercise_id), then removed old program_owner_exercise_day index. Existing program deletion guards are unchanged by these statements.

User reported successful execution and pasted final structure query results:
custom_json=1, program_occurrence=1, media_occurrence=1, guards=2, new_index=1, old_index=0.
Post-swap preference count was requested but its separate result was not supplied. No delete of existing application rows was instructed. This is user-provided live console evidence, not direct agent remote verification or full functional acceptance.

## Important reconciliation notes

The backup table is a temporary copy with two account preference records. Retain for immediate verification; reconcile and remove it through an explicitly authorized cleanup once no longer needed, including account-deletion retention implications. Do not treat it as a permanent additional preference store.

The manual steps did not record canonical migration ledger entries, and trigger names differ from canonical migration 0050. Do NOT blindly rerun 0050, 0051 or 0052: inspect and reconcile the actual schema and the established runner ledger first. This was a controlled console continuation, not evidence that the canonical migration runner completed.

## Remaining release checks

Confirm Cloudflare's watched branch is main and trigger a fresh isolated LAB build. Preserve the existing isolated build flag, generated-config preflight, dedicated D1/R2 bindings and keep_vars. Inspect build logs and deployed revision. Then test real login, all 13 themes, refresh/relogin/device persistence and repeated-exercise behavior. No Production publication is authorized by this checkpoint.
