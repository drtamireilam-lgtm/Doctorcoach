# Repeated exercise occurrences and stabilization — 19 October 2026

## Source state

Branch: `stabilize/repeated-exercise-occurrences-20261019`, based on PR #13 code commit `b6d1046a0ad2b7f44f7841462abfe33b9b76eba7`. No main merge, Production deployment, remote migration, real-user data edit or staff permission change.

Rechecked the repository branch inventory (23 heads before this branch). Relevant lineage: root main is the older Vite/Supabase app; PR #4 imports an older v90 Site snapshot; PR #7–10 implement/verify standalone authentication and isolation; PR #11 is the old root theme picker; PR #12 changes the old root next-set algorithm. The standalone application already has its own newer theme, set-load and authentication implementations. PR #13 completes its requested presets and full-app CI. Do not replace the full app with main or merge divergent app architectures blindly.

Read-only Sites metadata confirms Production at https://doctorcoach.dr-tamireilam.chatgpt.site, published version 171, source `ce4cba9f3e5c703bf84b801e05491070a00fe947`, successful deployment dated 14 October. The standalone source records this v171 provenance and subsequent development additions. Latest saved version and its actual successful publication were both checked.

LAB source targets https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev. A read-only unauthenticated GET of `/auth/signin` returned 200 and the sign-in HTML. This does not establish current deployed source, functional email delivery, remote migrations or database isolation. Wrangler is still unauthenticated in this session.

## Root causes and implemented behavior

The previous builder disabled duplicate library choices, assigned-plan validation rejected duplicate `(dayId,exerciseId)` pairs, independent plans had a unique database index on those pairs, and live-set mutation/effort changes/next-set calculations selected by exerciseId. Removing the validation message alone would update the wrong occurrence.

`PlanItem.occurrenceId` now identifies the prescribed occurrence; exerciseId continues to identify the shared library exercise. New editor/independent additions get separate UUIDs. Legacy missing IDs normalize deterministically by day/exercise with collision-safe ordinal suffixes. Existing JSON is not rewritten. Explicit duplicate IDs and malformed IDs are rejected. Legacy exercise-only mutation requests work only if there is exactly one matching occurrence; ambiguous writes fail without changing a set.

Changes cover:

- Coach add/review/private draft/assignment, independent plan add/edit/remove, reusable templates, spreadsheet import and copied days/programs.
- Per-occurrence sets, reps, ranges, weight, per-set targets, RPE/RIR, notes, ordering, React keys, dirty tracking and workout navigation anchors.
- Set saving, effort-scale changes, automatic precise next-set calculations, manual equipment suggestions and coach-approved substitutions.
- Workout history and occurrence-specific comparisons. Graphs remain grouped by library exercise and include all its performed occurrences; a generic next-workout suggestion is suppressed when the latest workout contains multiple prescriptions of that exercise.
- Private set videos carry the occurrence ID through upload, list, retry and final write guard. Ambiguous or foreign contexts fail; existing legacy video links remain readable under their unchanged authorization rules.
- Conditional upsert prevents a racing different catalog exercise from taking over the same occurrence ID or falsely reporting a successful save.

No Heavy/Volume naming feature was added. Existing e1RM/RPE/RIR formulas were retained.

## Migration — prepared, not applied remotely

`apps/doctorcoach-standalone/drizzle/0052_exercise_occurrences.sql` adds nullable occurrence columns to program_items and media_assets and replaces the program day/exercise unique index with owner + occurrence identity. Legacy NULLs resolve to the original day/exercise identity. No table is rebuilt, no row is deleted, no history is rewritten, no deletion guard is removed. Migration preservation and deletion-barrier tests run against a populated pre-0052 schema. Do not deploy this source over a database missing the migration.

## Tests actually run

- Root `npm ci`, `npm test` (10 foundation + 6 profile/RLS), `npm run build`: PASS.
- Standalone locked pnpm install: PASS, no dependency/lockfile changes. This app uses pnpm-lock.yaml rather than a fabricated npm lock.
- Standalone full final suite: **1,210 passed, 0 failed, 0 skipped**.
- Eleven new occurrence regressions include barbell Bench across three days, same-day repeated Squats, Conventional Deadlift twice weekly, different sets/targets, draft save/reload/edit, approval/assignment, independent persistence, set execution/history/e1RM graphs, copies/templates/import, reordering, legacy compatibility, ID collision rejection, video isolation and a competing-insert race.
- TypeScript and standalone production build: PASS.
- Built workerd HTTP smoke: PASS using synthetic identities and disposable D1/R2. Extended smoke creates two same-exercise occurrences through the actual HTTP API, updates one with RIR/next-set load, verifies the other is unchanged and retains both in history. Existing OTP, registration, rollback/retry, coach/doctor/admin/trainee, cross-owner isolation, private media and logout checks retained.
- Root LAB branch 90283fb: tests and build PASS.
- Separate anatomy branch 1dcb0a5: tests and isolated anatomy build PASS. Geometry/interaction tests passed; it remains a 15-muscle schematic prototype, not a clinically validated atlas. No integration into Production.
- `git diff --check`: PASS.

Earlier tests that asserted duplicate prescriptions must be rejected were updated to assert independent identities instead. A newly introduced SQL quoting error and a video INSERT binding mismatch were detected during development and corrected before the final passing runs. No failing run is counted as a pass.

## Other requested modules

- Seven requested themes plus Classic, Hebrew/English names, visual previews, owner persistence and contrast are retained from PR #13 and covered by the full regression suite. Whole-screen browser/mobile visual acceptance is still pending.
- Registration, email-switch, duplicate-registration races, old-profile identity mapping, revocation, medical consent, independent coaches and private-file boundaries remain covered by synthetic tests. No real OTP was sent.
- Existing 157-exercise catalog retains Hebrew/English names, bilingual search, muscle/equipment filters and stable library IDs. No catalog copies were created to work around repeated prescriptions. Translation quality and clinical accuracy have not received a new human review.
- Existing next-set precise calculated weight remains separate from the optional equipment-rounded suggestion. It updates within the active workout. All set-load regression tests pass.
- Browser QA remains blocked: this environment has no usable Chromium; the previous download attempt returned invalid/truncated archive content. No touch gestures, screenshots, real-device FPS or universal rendered-screen contrast pass is claimed.

## Required external actions and next priorities

Only external handoffs needed: authenticate Cloudflare in the working session and supply a controlled test mailbox/OTP for manual live acceptance. The agent can perform the remaining LAB preflight and release steps once that access is available. Do not send tokens or secrets in chat.

Next priorities:
1. Verify isolated LAB remote bindings and existing schema, apply only missing migrations, then release this candidate to LAB and execute real-mail/mobile acceptance.
2. Browser regression for repeated-exercise builder, all seven themes, saved preferences across sign-out/in, and second-account separation.
3. Continue separate anatomy bilingual content/geometry validation and real-device performance testing before considering integration.

See `apps/doctorcoach-standalone/standalone/EXERCISE-OCCURRENCES-LAB-2026-10-19.md` for exact read-only checks and the conditional LAB migration/build procedure.
