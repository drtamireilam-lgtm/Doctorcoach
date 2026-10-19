# Appearance refresh regression — 2026-10-19

## Evidence and cause
The user reproduced light-mode changes reverting after Safari refresh on the isolated staging Worker. Screenshots identify build a202ceb3 from commit 8e0c3f7. That implementation previews mode/palette changes locally but loads account preferences on mount, overriding unsaved choices. Its picker has a separate account-save action below the preview. The report does not establish failure of an explicitly confirmed server save.

The newer advanced picker already supports explicit Apply/Cancel and owner/version checks. Its header toggle also only edited a draft, so it would revert on reload.

## Change
The header light/dark toggle now passes the newly selected appearance directly to the existing authenticated save operation. It must not depend on reducer state updating synchronously. Concurrent save calls are guarded by the synchronous saving ref. Owner, version, conflict and response validation remain unchanged. The header reports save success/failure/conflict; picker save/cancel and unsaved-preview guidance are explicit in Hebrew and English. Advanced color edits still require Apply and save.

## Verification
The regression test executes the real JSX button handler with deliberately stale render state and asserts that the new mode is passed to save in both directions. Existing database tests verify persistence after store recreation and owner isolation. No live account or workout data were changed.

## Release boundary
This branch is stacked on stabilize/lab-acceptance-20261019 and includes its prerequisite appearance and exercise-occurrence migrations (0051, 0052). Do not deploy before checking the isolated D1 migration ledger and reviewing/applying the missing safe migrations. Do not execute these SQLite migrations in Supabase/Postgres. No remote migration or deployment was performed for this fix. Safari acceptance after actual deployment remains pending.
