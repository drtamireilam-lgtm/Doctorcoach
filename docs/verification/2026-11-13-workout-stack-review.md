# Workout stack integration review — PR77–80

Scope: review the complete stack above PR76, preserve PR75's0061 prerequisite,
fix reproduced issues, rehearse additive migration compatibility and prepare LAB
acceptance. No merge, deployment, remote SQL, credential change or real data write.

## Finding fixed

The journal declaration used a named unique index but migration0062 creates a
composite primary key `(session_id,version)`. This was declaration/DDL drift,
not a missing constraint in the actual SQL. The new regression failed with an
empty declared primary-key list before the fix. `db/schema.ts` now declares the
same composite primary key and owner index as the migration. SQL files are
unchanged; no corrective or destructive database migration is needed.

## Integration and compatibility evidence

- All four PRs were open, Draft, unmerged, cleanly stacked and green at review
  start; bases are PR76 ->77 ->78 ->79 ->80. No upstream user changes found.
- Independent review inspected cache ownership/revisions, mutation/refresh
  ordering, substitutions, session controls, retrospective reconstruction and
  rest/order wiring. No remaining actionable client defect was confirmed.
- Fresh focused integration/migration/security suite:80/80 passed. Independent
  client subset23/23 passed (overlaps; do not sum these counts).
- New migration tests exercise populated pre0061 and partial0061/0062 databases;
  every original user-table column value is compared after each upgrade.
  Existing session JSON and timestamps, programs, coach drafts, retrospective
  drafts and journal records remain unchanged. Nullable defaults, range/integer
  checks, PK/index consistency, FK/cascade, deletion barriers and fail-closed
  structural preflight are verified.
- A separate local workerd/D1 rehearsal applies0061–0063 to populated synthetic
  tables, then checks old values and constraints. Its JSON records LF-normalized
  SQL checksums and explicitly reports `labRuntimeVerified:false`.
- Typecheck, targeted lint, production build and built authenticated Worker
  smoke passed after the declaration fix. Final full-suite and exact-head CI
  counts are recorded in the PR80 description and external delivery report.

## LAB readiness boundary

The source has no remaining blocker identified by this review after the fix.
Migration compatibility is verified locally for the known schema through0060,
then0061 ->0062 ->0063. The actual deployed LAB schema and backups have not been
attested by these tests. Public LAB availability was HTTP200; this is not schema
or feature acceptance. The installed workerd binary rejected the LAB's October
compatibility date, so local D1 rehearsal uses the existing May15 test baseline;
selecting a matching date alone cannot establish live/runtime acceptance.

Follow the workout-stack section of `standalone/MIGRATION-RUNBOOK.md`: reconcile
current structural metadata and backup/recovery evidence, confirm both migration
namespaces, review exact missing objects and candidate source, and obtain separate
approval before any remote SQL or deployment. Keep additive data on code rollback.
Then run synthetic bilingual lifecycle/permissions/connectivity acceptance and
physical iPhone/Safari checks. None of those remote actions occurred here.
