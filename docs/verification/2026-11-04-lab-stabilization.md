# DoctorCoach — LAB stabilization and release readiness, 4 November 2026

## A. Executive summary

Fresh read-only Cloudflare/D1 inspection **does not reproduce the historical missing `last_attempt_at` blocker**. All 95 required application/identity/management tables and their required column names match a disposable database built from the checked-in SQL. The four Calendar receipt columns, management tables, guidance column and assignment provenance column are present. The remote Wrangler ledger has zero entries despite the populated schema. Replaying migrations would be unsafe.

Added an offline preflight and regression tests that detect missing/partially applied schema, refuse generic replay advice, and prepare only missing Calendar additions for human review. The tool never opens a remote connection or applies SQL. Historical migration bytes remain unchanged. No runtime/UI/auth/permission behavior was changed.

The integration baseline's full test suite reproduced one date-dependent fixture failure (1,737 pass / 1 fail). The exact test-only correction already present in PR #65 commit `d45c4e6` was reused without importing that PR's UI changes. This avoids divergent fixes when #65 is eventually integrated.

No deployment, remote migration, ledger backfill, account/grant update, secrets change, PR merge or real Calendar event was performed.

## B. Repository status and chosen base

| Item | Verified state |
|---|---|
| Default branch | `main`, head `818e4ce`; package version remains `0.1.0` |
| Correct stabilization base | `codex/integration-59-60-61-20261029`, `e95108a6b2a67086296621107c50b446a3d90619` |
| PR #62 | Open draft targeting `audit/full-lab-20261027`; integration is not merged into main |
| PR #63 | Merged into integration on 30 October, merge `e95108a` |
| PR #64 | Merged into #63, merge `2822f11` |
| Integration CI | Run `41104052529`, completed success on `e95108a` |
| PR #65 | Open draft, head `13dff06`; Premium Workout Experience 4.0 remains separate |
| PR #65 CI | Run `41180785987`, completed success on `13dff06` |
| This branch | `stabilize/lab-readiness-20261104`, based on integration |

Integrated source includes Calendar delivery receipts/retries, consultation management, UID management/guidance code, Cardio/activity, Smart Import 3.0/3.1, and Premium UI 3 with light-mode fixes. Open source PRs #52–62 are not evidence that their changes are absent: their work is incorporated into the integration stack. Other older open stacked PRs include #43–50. Main remains behind that stack.

`1952aac`'s historical standalone failure was already addressed in #63: fixed fixture clocks around the last-48-hours billing guard. It is distinct from the activity reporting-window failure reproduced now.

## C. Confirmed issues and severity

| Severity | Finding | Consequence |
|---|---|---|
| High operational | D1 schema populated, `d1_migrations` empty | Generic migration replay can collide with existing tables/columns; ledger reconciliation requires separate reviewed procedure |
| High activation blocker | No Calendar configuration bindings and zero Calendar connections | Real synchronization cannot work in current LAB; 4 outbox rows are pending; do not replay them against a real calendar |
| High activation blocker | `DC_USER_MANAGEMENT_ENABLED` absent; zero UID owner/secretary grants | Management code/schema exist but the new management workflow is not activated; do not enable before canonical identity bootstrap |
| Medium CI | Activity overlap fixture depends on real current week | Reproduced on integration; corrected using the already reviewed PR #65 test patch |
| Verification limitation | Current protected full backup/restore not exercised | Fresh backup and isolated restoration remain prerequisites for any future data/schema mutation |
| Verification limitation | Local Chromium download returned invalid/truncated ZIP | Local browser workflows could not run in this session; built HTTP checks passed; PR CI must supply browser evidence |

## D. Files and fixes

- `apps/doctorcoach-standalone/standalone/scripts/lab-schema-preflight.mjs`: builds all 61 app SQL files and all 3 standalone SQL files in disposable SQLite. Standalone identity precedes management/guidance; management is applied after app provenance migration. Compares required table/column names to a metadata-only snapshot; returns nonzero for mismatch or malformed input. Never infers schema state from ledger count.
- `apps/doctorcoach-standalone/tests/lab-schema-preflight.test.mjs`: six tests covering empty ledger, missing Calendar/management structures, partial Calendar recovery preserving synthetic records, incomplete baseline refusal, malformed input, and CLI failure/input preservation.
- `apps/doctorcoach-standalone/tests/activity.test.mjs`: exact PR #65 `d45c4e6` correction anchors the overlap fixture's clock to its intended reporting week. Production calculations, window length and assertions stay intact.
- `docs/verification/lab-stabilization-20261104/schema-columns.json`: fresh read-only table/column metadata; no user records, tokens or secrets.

The partial Calendar repair helper returns **a review plan**, not an idempotent SQL runner. Reinspect immediately before any approved execution. The original `0060` SQL is deliberately not rewritten or reapplied. Current LAB needs **zero** statements from that migration.

## E. Database and infrastructure status

Remote column-name compatibility: **PASS, 95 required tables**. This is not full equality of types, defaults, checks, foreign keys, trigger definitions or data semantics. Calendar and management PRAGMA metadata were also inspected; required trigger names exist. Remote aggregate queries reported zero writes/changes. A table-valued PRAGMA JOIN was rejected by D1 (`SQLITE_AUTH`); individual read-only PRAGMA calls succeeded instead.

Migration systems differ: app SQL resides in `drizzle/`; its generator journal ends at `0051`, while checked-in SQL continues through `0060`. Standalone Wrangler config points to its separate `standalone/migrations` directory. Neither generator metadata nor an empty Wrangler ledger proves what was applied remotely. Do not fabricate timestamps, backfill the ledger or invoke either generic runner as recovery. Historical application provenance is not reconstructed by this audit.

Remote Worker currently serves version `806f8f32-acbf-46d5-9daf-7e820fedc55b` at 100%, deployed 30 October. D1 binding is `0e7a9467-5758-4d6f-b52a-ee4385a2d37d`, named `doctorcoach-isolated-staging`; R2 binding is the separately named LAB bucket. Worker config matches local compatibility date `2026-10-14` and `nodejs_compat`. workers.dev is enabled, preview URLs disabled. R2 managed public domain is disabled and no custom R2 domains exist. Private PDF/video byte access and cross-user denial passed synthetic built Worker checks; no live upload was performed.

Supabase URL matches the isolated project `jbfkzkzcznfacsjdawmf`; connected project metadata identifies `DoctorCoach-Staging`, `ACTIVE_HEALTHY`. Session/public-key secrets were checked by binding presence only, never printed or changed. No real OTP/OAuth login or provider delivery was attempted. Legacy bridge is disabled and billing mode is manual. LAB staging policy blocks personal Calendar use and requires explicit secondary test-calendar configuration.

Supabase security advisor additionally reports 12 authenticated-callable SECURITY DEFINER RPC warnings, 2 RLS-without-policy informational findings, and disabled leaked-password protection. These are review findings, not established exploits. Read-only inspection of `dc_manage_team_member` and `dc_list_team_members` confirmed explicit active-owner checks and owner-change guards; the remaining RPCs were not exhaustively audited. No broad grants or policy changes were made. The server's staging-session validation wrapper exists.

## Calendar and team workflow verification

Desktop/mobile consultation UI share `/api/appointments`: authorize → persist appointment → trigger/outbox version → Calendar sync → token refresh → deterministic event ID → provider response → readback of ID/marker/time → persist receipt → administrator status. Retry reauthorizes the appointment. Current code distinguishes disabled/error/pending/synced; HTTP acceptance alone is not delivery proof. Existing tests cover retries, receipt mismatches, provider failures, revocation and duplicates. The October device-specific symptom was not reproduced with live accounts; today's missing connection is a separate confirmed configuration blocker.

Server-side management tests cover owner/secretary authority, self-role escalation denial, forged headers, role/coach changes, independent/coached/awaiting-assignment modes, immediate revocation and clinical/billing redaction. Built HTTP checks confirm coaches cannot access private medical consultation management. Canonical real identities for the owner and Shira were not bootstrapped, so real-person access is not certified. Nadav must not be added to clinician/admin/operations allowlists or UID owner/secretary grants.

Premium UI 3 was preserved. Existing built HTTP flows verified authentication, training retrieval/logging, RPE/RIR and next-load calculation, progress ownership, importer assignment and consultation management. Visual layouts and physical-device acceptance remain outside those HTTP results.

## F. Local verification

| Check | Result |
|---|---|
| Locked standalone dependency installation | PASS, pnpm 11.25.0; initial offline attempt lacked cache metadata, normal locked install succeeded |
| Standalone tests | 1,744 passed, 0 failed, 0 skipped |
| Foundation / local PostgreSQL RLS | 10 + 6 passed |
| TypeScript | PASS |
| Foundation build | PASS, existing chunk-size warning |
| Isolated standalone/Worker build | PASS, existing route-classification/chunk-size warnings |
| Static isolated deployment target | PASS |
| Built workerd/D1/R2 synthetic HTTP suite | PASS, including auth, permissions, private media, workouts/import, management and Calendar readback/retry |
| Offline Cardio migration rehearsal | PASS |
| Schema snapshot comparison | PASS, 95 required tables, no missing names |
| Focused lint | 0 errors, 1 inherited unused-variable warning |
| Whole-project lint | FAIL: 78 errors / 116 warnings, matching documented integration debt; no suppression added |
| Browser / physical device / real provider | Local browser BLOCKED by download; physical devices and live providers NOT TESTED |

The standalone suite includes populated local Calendar/management migrations and baseline backup restoration tests. These do not certify a current remote backup. Exact PR CI results must be read from the PR checks; historical runs above are explicitly identified.

## G. Pull request scope

Target integration, not main. Do not merge the feature stack or PR #65 as part of this task. The stabilization PR contains offline tooling, tests and sanitized evidence only. No dependency or lockfile changes, runtime changes, remote migrations or UI redesign.

## H. Controlled LAB procedure — approval required before remote changes

1. Pin the reviewed PR commit, require final CI and review the actual diff. Recheck Worker version, D1/R2 IDs, staging Supabase origin, configuration names and current schema/ledger. Run local checks below.
2. Before any future approved remote migration, pause competing administrative writes under a controlled maintenance window; capture a current Time Travel bookmark and protected full SQL export. Export can interrupt service; schedule accordingly. Include R2 inventory/objects/metadata if media paths change. Never commit real backup content.
3. Restore the protected SQL into a disposable local database. Run integrity/FK checks, compare table counts/records and application queries; rehearse the exact proposed SQL there. Verify R2 restoration separately if relevant. Stop on mismatch. This session did not perform steps 2–3 against current real data.
4. **Current migration execution plan is NO-OP**: all required names exist. Do not apply `0060`, standalone `0002/0003` or a generic runner. If a fresh inspection finds drift, review types/defaults/constraints and prepare only exact missing additive statements from the correct namespace; obtain approval for that exact SQL and target. No destructive rollback SQL.
5. Recollect schema metadata and validate independently of ledger. Use read-only `PRAGMA table_info`, sqlite_master, narrowly scoped `SELECT ... LIMIT 0` and integrity/FK queries. Do not treat the checked-in snapshot as a future live check.
6. This PR changes no runtime code, so deployment is unnecessary to use its preflight. If a later runtime candidate is approved, build with `DC_ISOLATED_STAGING_BUILD=true`, validate the generated target and deploy only the approved SHA to the pinned LAB Worker. Do not change automatic build branch settings or production.
7. Smoke signed-out and authorized test-account login/logout, cross-user denial, program retrieve/log/edit/reload, RPE recommendations, progress, exercise library and consultation states. Calendar acceptance requires separately approved secondary test-calendar setup and synthetic appointments. Do not drain the 4 existing pending rows into any real calendar without separate review/approval. Management activation requires verified canonical owner/Shira IDs and separately approved grant/bootstrap plus feature flag change.
8. Roll back code to the freshly recorded prior LAB Worker version if auth/permissions/workflows regress. Retain additive columns. Do not DROP columns or automatically restore the database. Data restoration can discard newer writes and requires separate approval and reconciliation. Recheck bindings and smoke tests after rollback.

Offline commands, from `apps/doctorcoach-standalone`:

```bash
node standalone/scripts/lab-schema-preflight.mjs expected
node standalone/scripts/lab-schema-preflight.mjs check ../../docs/verification/lab-stabilization-20261104/schema-columns.json
node --experimental-strip-types --test tests/lab-schema-preflight.test.mjs tests/calendar-migration.test.mjs tests/user-management-migration.test.mjs
node standalone/scripts/cardio-migration-preflight.mjs rehearse
npm test
npm run typecheck
DC_ISOLATED_STAGING_BUILD=true npm run build:standalone
node standalone/scripts/check-isolated-staging.mjs dist/server/wrangler.json
node --experimental-strip-types standalone/scripts/runtime-smoke.mjs
```

Read-only snapshot input: `tables` maps table names to arrays of unique column names; `ledgerRows` is the observed count or null if unverified. Capture metadata only. `check` exits 0 for column-name compatibility, 1 for mismatch, 2 for invalid input. Exit 0 is **not deployment authorization or full release readiness**.

## I. Readiness and next task

**CONDITIONALLY READY as an isolated development candidate**, subject to final PR CI and review. **Not ready for full Calendar/management activation**: missing live configuration/grants, protected fresh restore verification, real-account/device acceptance and remaining security-advisor review. No missing-column emergency was confirmed and no schema repair should be executed now.

Next technical gate: controlled secondary Calendar test setup and canonical UID management bootstrap, with explicit approval. Premium UI work can continue independently by reviewing PR #65 against this integration base, including responsive Hebrew/English decimal-load and workout persistence acceptance. Keep the existing Premium UI 3 design system.
