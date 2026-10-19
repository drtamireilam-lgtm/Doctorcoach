# Return-plan history — 2026-10-09

Added schema migration 0014, generated from the Drizzle schema and extended with
return-record snapshot triggers. There is no migration backfill or data deletion.
Successful inserts/updates snapshot the saved return plan in the same SQL
statement. A failed snapshot aborts the plan write. Stale/conflicting updates and
idempotent retries do not append phantom versions.

Each snapshot retains the record version, reporting day, stage, goals, limits,
milestones, author display name and save timestamp. Existing plans get one marked
baseline at their first edit; missing older history is not invented. The author
name is the existing saved display name, not a newly verified identity/audit actor.
No edit/delete history endpoint or restore-old-version control was introduced.

The existing authorized wellness bundle includes the latest 50 snapshots and the
total count. The return-to-activity tab shows expandable snapshots and transitions
between adjacent displayed versions. The owner account export includes all of
their stored revisions. Staff revocation blocks history through the same access
check as the current return plan. Clinical restrictions, clearance gates and
training prescriptions remain unchanged.

Verification: TypeScript and targeted migration/store tests passed. Tests cover
baseline capture, preserved content, retries, stale writes, rollback on snapshot
failure, ownership, revocation, export and forged history payloads. Publication
runs the full 150-test suite and production build. Live migration application is
part of Sites deployment; browser/mobile and real-account journeys are not
end-to-end verified.

Remaining rehabilitation gap: plans are still one current return plan per person,
not independent injury episodes. Inspect the active-injury/file architecture before
adding episode linkage. Live journey verification remains a release gap.
