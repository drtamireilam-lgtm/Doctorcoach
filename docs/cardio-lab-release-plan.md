# CARDIO 2 local LAB release candidate and approval gates

Status: local candidate preparation only. No remote reads, migration, deployment, production write or main-branch merge is authorized by this document. Activity and training data live in Cloudflare D1; the Supabase LAB project `jbfkzkzcznfacsjdawmf` serves authentication only. Native build, signing, device permission/revocation, watch sources and background delivery remain separate acceptance work.

## Target and migration identity

The sole proposed Worker, D1 database and R2 bucket are named `doctorcoach-isolated-staging`. D1 UUID: `0e7a9467-5758-4d6f-b52a-ee4385a2d37d`. Allowed origin: `https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev`. The preflight reuses `standalone/scripts/check-isolated-staging.mjs` for the built config; it does not establish remote resource ownership or current state.

PR53 owns 0053 and 0054. PR52's previously overlapping filenames are renamed without changing their SQL:

| Order | Candidate file | Previous PR52 filename | Expected additions |
| --- | --- | --- | --- |
| 1 | `0053_embedded_warmup_sets.sql` | None (PR53) | `program_items.warmup_sets_json`, `.side` |
| 2 | `0054_load_metadata.sql` | None (PR53) | `program_items.load_json` |
| 3 | `0055_cardio.sql` | `0053_cardio.sql` | `program_items.cardio_json` |
| 4 | `0056_activity.sql` | `0054_activity.sql` | `activity_connections`, `activity_step_days`, `activity_step_goals`, `activity_shares`; unique enabled source per owner |
| 5 | `0057_cardio_weekly.sql` | `0055_cardio_weekly.sql` | `activity_cardio_weekly_goals`; bounded weekly targets and author role |

Current SQL byte hashes (regenerate the JSON manifest if any SQL changes):

| Ordered file | SHA256 |
| --- | --- |
| `0053_embedded_warmup_sets.sql` | `19c54c11fdbba1b447756201ef993b67b77860a9ac9d9b5fefd69b838228278f` |
| `0054_load_metadata.sql` | `7a491a1e37b0c0f9e40430e249871c251924f6dbbac709be098ccb22a291114f` |
| `0055_cardio.sql` | `3b3a935214187a5c497977e49b35ed30a35ea6cf7db8ba53326312334dff830e` |
| `0056_activity.sql` | `9e29cc61187f1d0e210dfa89581220b4bc6bf26f334ade26ddbe5af3ffae7047` |
| `0057_cardio_weekly.sql` | `7fd44e34ed7cb70d21e9f7822e3b034e5dcea6743936a9f100991246f57567dc` |

Generate the authoritative ordered SHA256 manifest (with every expected new column) from the final candidate's exact source:

```sh
# From apps/doctorcoach-standalone; all commands in this block are local.
node standalone/scripts/cardio-migration-preflight.mjs manifest
node standalone/scripts/cardio-migration-preflight.mjs rehearse
node --experimental-strip-types --test tests/cardio-migration*.test.mjs tests/native-activity-client.test.mjs
```

The offline rehearsal builds all source migrations 0000–0052 in in-memory SQLite, adds the complete standalone identity schema, seeds synthetic program/session/appearance rows and all ten identity/auth tables, and applies 0053–0057 in order. After each migration it compares every old-column row multiset, original column definitions, indexes and triggers, and checks integrity/FKs. It validates new tables/columns, null additive defaults, side validation, the existing account-deletion write barrier, enabled-source uniqueness and weekly target bounds. Current fixture results: 86 original tables retained; 14 populated tables retained, including all ten identity/auth tables. This is a populated synthetic fixture rehearsal, not proof about the remote LAB database or a restored live backup.

## Local candidate packaging

The CI workflow builds with `DC_ISOLATED_STAGING_BUILD=true`, verifies the built isolated target and synthetic Worker authentication, and packages the existing `dist` candidate. The package directory also contains source commit/hash, the ordered migration manifest, offline rehearsal results, the five unchanged SQL files and SHA256 sums. CI uploads the candidate without deployment. Cardio branch pushes and PRs targeting PR53's `codex/exercise-recognition-3-*` branch trigger CI, including explicit mobile Hebrew/English browser and native contract checks for the cardio branch. Native contract tests do not compile or execute either mobile platform.

To reproduce the package locally after all checks and the final source commit, use the commands in `.github/workflows/ci.yml`'s “Package verified isolated LAB candidate” step. Verify `SHA256SUMS` from inside its package directory. A source hash calculated before later source changes or a package built before the final merge is provisional; rebuild and repackage after the final source state. Do not deploy directly from a stale working build.

## Gate A — verify the remote target and prepare protected backups

Read-only verification of the named LAB is authorized by this task. Present the exact candidate commit, source hash, package SHA256 and migration manifest before proposing any mutation. This gate includes account/resource verification, schema/ledger inspection, complete D1 export and protected R2 inventory/backup access; backups may contain personal information and must stay in access-controlled storage, outside git and CI public artifacts. Connection access remains a technical prerequisite; it does not authorize migrations or deployment.

With authenticated read access, inspect the exact target config and Cloudflare account, then capture the full remote `sqlite_master`, `PRAGMA table_info` for touched tables, indexes, triggers, row counts and every actual migration ledger (`d1_migrations`, Drizzle ledger if present). Record whether PR53 0053/0054 or the old PR52 filenames were previously applied; stop on any partial or conflicting schema. LAB notes describe manual 0050–0052 application without corresponding ledger entries; these notes are not authoritative remote evidence. The Drizzle journal currently ends at 0051, and Wrangler's configured `migrations_dir` points to standalone identity migrations only. Therefore neither a generic Drizzle migration run nor `wrangler d1 migrations apply` automatically represents this ordered application plan. Do not change a ledger or point an unattended runner at all drizzle files.

Export a complete LAB D1 backup including every application table, all identity/auth tables, original indexes/triggers and available migration metadata, then record a SHA256, export timestamp and source resource ID. Back up or securely inventory all LAB R2 object keys, versions/metadata and byte hashes as needed for the release and restoration plan. Capture the currently deployed Worker version, bindings and owner-managed configuration; preserve the previous deployable artifact. Record secret names and restore availability without exposing secret values.

`standalone/scripts/snapshot.mjs` deliberately excludes ten identity/auth tables and compares identical schema. It is useful for its original narrow purpose, but it is neither a complete backup nor an additive migration verifier. Do not use its success to claim whole-database preservation, identity preservation or a viable rollback.

## Gate B — prove restore and reconcile the precise pending migration plan

Restore the approved complete export into an isolated local SQLite copy before any remote mutation. Verify integrity, foreign keys, all-table row/old-column values (including identity), indexes/triggers and backup object hashes against the source capture. Never import a backup into production or overwrite the LAB as a restore rehearsal.

On a second local copy of that restored snapshot, apply only the pending candidate files, in manifest order, using their reviewed SHA256 values. Inspect existing new columns/tables first: if 0053/0054 were already applied, preserve them and omit their execution after proving exact schema equality. If an old PR52 name appears in a ledger, reconcile by SQL hash and actual schema; renaming a file is not a reason to rerun it. Never use `IF NOT EXISTS`, suppress duplicate-column failures or hand-edit the ledger to conceal mismatches. Establish a reviewed ledger strategy that records actual pending SQL and handles the manual 0050–0052 history explicitly. Stop if actual data/schema disagree with the plan.

Preserve all preexisting row projections through the rehearsal, including identity; compare intended new schema independently. Exercise application contracts on the migrated restored copy. Document the exact ordered remote SQL commands and transactions, expected changes, time/cost window, write-quiescing procedure, backup artifacts and rollback owner. This is the reviewable migration proposal for the next gate; the fixture-only rehearsal does not replace it.

## Gate C — separate explicit approval for remote migration and LAB deployment

Only after Gate B passes, request approval for the exact D1 migration command list and candidate deployment SHA, naming `doctorcoach-isolated-staging` and its UUID again. No production target, main merge or mobile store publication is part of this approval. Pause LAB writes/traffic as agreed; verify target, schema and backup freshness immediately before execution. Apply pending SQL only, verify schema, old values, identity and deletion guards, then deploy the already-reviewed candidate to the isolated workers.dev endpoint with the existing checked config and preserved vars/bindings.

For any failure, stop before subsequent SQL or deploy steps. Additive columns may permit returning to the old Worker, but this must be tested against the actual prior version. Prefer a verified forward fix or Worker rollback where safe. Restoring the full backup can discard writes since capture; it requires its own explicit approval, agreed quiescing and reconciliation of those writes. Do not attempt a destructive down migration, delete activity tables, or replace the LAB database to make an error disappear.

## Gate D — actual LAB acceptance evidence

After approved migration/deploy, verify authenticated real application navigation, Hebrew/English mobile layouts, existing warmup/load/import/anatomy behavior, cardio-only and mixed workouts, pause/recovery/replay, owner/coach boundaries, separately shared cardio and heart-rate data, zero versus missing steps, disconnect/revocation and export/delete scope. Use dedicated consented test accounts. Record the deployed Worker version, candidate SHA, schema/ledger snapshot, timestamps and screenshots. The offline browser fixture and native serializer contracts are synthetic local checks; device HealthKit/Health Connect delivery, signed native builds and background operation require their own evidence. Keep release status partial until these checks are actually performed.
