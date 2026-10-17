# Verified source access and backup blocker

Read-only inspection of the actual DoctorCoach Sites project in this session:

- Project: `appgprj_6ab2e7655fc08191866f30fac2eaefaf`.
- Site status active; authenticated project role owner; current version 171.
- Version 171 source commit: `ce4cba9f3e5c703bf84b801e05491070a00fe947`.
- A saved source tar archive exists (476 files, 21,288,960 bytes). This is source
  provenance, not a database or private-object backup. It was not downloaded as
  a substitute for runtime data.
- Database overview returns binding `DB` and 50 table names, stopping at
  `return_plan_revisions`. The response marks its projection untruncated.
- The development reference schema contains 72 application tables. Its 22 names
  not observed include `training_sessions`, `workout_logs`, `user_consents`,
  `user_intakes`, `training_access` and workspace tables. This discrepancy is a
  coverage warning, NOT a conclusion that live source tables do not exist or
  are missing data. Source-version/provider schema must establish the full list.
- The row-read tool is bounded to 25 rows per call, offsets no greater than
  10,000, with possible row/column/value projection. It exposes no arbitrary SQL.
  No existing user rows were read for this inspection.
- No full database export, consistent snapshot, private bucket listing/export,
  object metadata export or object-byte backup operation is exposed by the
  available Sites connector. GitHub/Cloudflare access to the new standalone app
  does not grant those capabilities on the old platform's resources.

## What was completed

Added `scripts/export-coverage.mjs`: compare exact expected/observed inventories
and fail on missing/unexpected/duplicate tables or any projected content. Even
matching names deliberately return `backupVerified:false`, because names do not
prove row contents, schema, consistency or private files. Four regression tests
cover these evidence boundaries. The full suite passes 1,121 tests, 0 failures
or skips. This update is verification code/documentation only; no application
deployment, source data writes, exports or live bridge activation occurred.

## Prepared provider export request (not sent)

Please provide the supported owner-authorized private backup/export mechanism
for the DoctorCoach Sites project identified above. We need:

1. A complete consistent D1 database export including original schema, tables,
   indexes, triggers, all rows, primary/foreign keys and original user/owner IDs.
2. The full private object inventory and bytes for the project's R2 binding,
   preserving exact keys, ownership references, HTTP/custom metadata, storage
   class and deletion-journal objects. Confirm every pagination page is included.
3. Source resource identity, export timestamp, consistency/write boundary,
   table/row/object counts, byte sizes and checksums sufficient for independent
   restore comparison in an isolated target.
4. A private delivery/restore path that does not expose clinical records,
   credentials or signed download URLs in chat, GitHub or public storage.

Read-only export only: do not deploy code, change access settings, modify or
delete source records, migrate accounts, or redirect users. If the database
viewer/export has limits, identify them explicitly. A source-code archive or
partial table view is not sufficient.

## Continuation

The necessary next access is a complete private source-provider export or an
authorized mechanism to produce it. Do not request a password/token in chat.
Once available, use a NEW restore target, follow `MIGRATION-RUNBOOK.md`, verify
all rows/schema/object metadata/bytes, then rehearse dual-account linking.
Do not overwrite the occupied standalone Staging test database.
