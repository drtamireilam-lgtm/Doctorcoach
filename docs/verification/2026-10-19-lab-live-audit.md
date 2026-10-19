# LAB infrastructure audit and acceptance checks — 19 October 2026

Development branch `stabilize/lab-acceptance-20261019`, based on repeated-exercise PR #14 at d805ab11f1ea2ad3d64375cb69ab540b5ee5378a. No main merge, Production deployment or real-user/role edits.

## Rechecked architecture and access

GitHub now has the prior theme and occurrence branches. PR #13 contains the current full-app themes/CI; PR #14 contains occurrence identity, D1 migration 0052 and its runtime tests. Both had passing remote CI in the prior phase. Separate `feature/lab-team-management` contains the older root Vite application's Supabase features; separate `feature/interactive-3d-anatomy` contains the original schematic anatomy prototype. Main is not the newest full application.

Production remains the verified Sites version 171 from source ce4cba9 at https://doctorcoach.dr-tamireilam.chatgpt.site. This is a D1/R2 application with Sites identity, not the root Vite/Supabase app. Source-only changes here do not publish it.

The full standalone LAB source uses D1/R2 for app data and Supabase for identity. Its configured URL is https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev. The separate root Supabase implementation stores its own training/team data in Postgres. Do not confuse these architectures or run D1 SQL against Supabase.

`wrangler whoami` still reports unauthenticated. No Cloudflare-specific tools were exposed and a fresh plugin-directory search for Cloudflare returned no plugin. Remote D1/R2 ownership, actual deployed source, schema readiness and environment bindings are not independently established. No remote migration or deployment was attempted without that evidence.

## Supabase LAB — read-only facts

Connected to the exact requested project jbfkzkzcznfacsjdawmf, named DoctorCoach-Staging, status ACTIVE_HEALTHY. Inspected metadata only; did not retrieve real user identities, profiles, clinical records, team rows or authentication tokens. No writes.

- 22 recorded migrations, from isolated session checking through immutable workout identity/no-reopen on 18 October.
- 11 public tables: dc_coach_athletes, dc_training_plans, dc_training_exercises, dc_workout_sessions, dc_workout_sets, dc_team_members, dc_team_invitations, dc_team_audit, dc_medical_consents, dc_medical_records, dc_marketing_assets. All have RLS enabled.
- Training and relationship tables were empty at metadata inspection; team_members had four rows. Those rows were not read or changed.
- Exercise instances use their own UUID primary key; no unique index forbids repeated exercise_key values. Workout-set uniqueness is session_id + exercise_id (instance UUID) + set_number. Therefore no duplicate-exercise schema migration is indicated for this Supabase architecture from this inspection.
- No appearance table and no public views. Appearance persistence in the full standalone implementation belongs to D1; absence here is not evidence of a missing D1 migration.
- Inspected policies contain owner/coach predicates and medical consent gates, no user_metadata-based role predicates. Insert/update workout policies check the exercise's plan/day/set count; session/set update guard triggers exist.
- Security advisor: two INFO findings for RLS tables with no direct policies (invitations/audit); twelve warnings for authenticated SECURITY DEFINER functions; leaked-password protection warning. All twelve exposed functions have pinned empty search_path, explicit auth.uid() in their definitions and no anonymous EXECUTE privilege. This metadata is not proof of complete function-body safety. Existing privileged RPC design was not rewritten or disabled. Password settings were not changed; live password/email configuration was not tested.

No matching pending Supabase migration was identified for these fixes. D1 0052 is prepared for the isolated standalone LAB only and remains unapplied remotely. Full live data isolation cannot be certified merely from distinct project names and RLS metadata.

## New practical acceptance checks

Added `powerlifting-acceptance.test.mjs` for the exact requested program: Sunday Squat/Bench/Deadlift; Tuesday Bench/Squat; Thursday Squat/Bench/Deadlift; Friday Bench/Bench. Ten independent occurrences have differing sets, reps, weights and targets. The test saves/reloads a private draft, reviews/assigns it, executes all four workouts and all their sets, checks history/e1RM series and verifies revising one Friday Bench leaves all other prescriptions and completed history unchanged.

Extended the actual built local Worker HTTP smoke to apply and read back Dark, Light, Blue, Purple, Wine Red, Yellow, Forest Green and Classic through owner-scoped preference endpoints. Existing OTP/registration/refresh, forged header rejection, rollback/retry, roles, cross-coach/private-file isolation, repeated-set execution and logout replay checks retained. Synthetic Auth only; no real mail was sent.

## Actual results

Standalone full suite: **1,211 passed, 0 failed, 0 skipped**. TypeScript passed. Isolated standalone build, static target-config check and built HTTP smoke passed. Existing dependency inputs unchanged. This phase did not require another dependency resolution.

The new anatomy work is isolated on feature/anatomy-bilingual-20261019: 15 muscles with translated content/UI/RTL/LTR, lazy 3D loading, low-power rendering preference and localized WebGL/context-loss alternatives. Its root tests and separate anatomy build passed; see its own BILINGUAL_QA_2026-10-19.md. It was not integrated into the full app or deployed.

## Verification boundary and continuation

Browser/device visual acceptance, real OTP delivery, mobile theme persistence across actual sign-out/in, current remote D1/R2 state and full live end-to-end journey remain unverified. A passing HTTP/model test is not a passing iPhone/Android or deployed-LAB test. The prior local Chromium download failure is not remedied by these tests.

Required external action: authenticate the Cloudflare session that will actually perform the isolated deployment, and complete controlled test-account email verification in the secure authentication UI when requested. A login in an unrelated browser/Windows terminal does not authenticate this execution session. Never send secrets in chat.

Once access exists, verify the dedicated Worker and bindings, inspect existing schema/migration ledger, preserve data, apply only missing predecessor migrations and 0052 to D1, rebuild with DC_ISOLATED_STAGING_BUILD=true, run the isolated-config gate and deploy only that verified target. Follow standalone/EXERCISE-OCCURRENCES-LAB-2026-10-19.md. No Production release is authorized.
