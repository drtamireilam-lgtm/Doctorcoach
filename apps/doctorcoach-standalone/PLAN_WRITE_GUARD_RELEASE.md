# Self-program persistence guards

Self-program upserts and template inserts now check active independent
entitlement, completed intake and absence of pending medical review in SQL.
Template batches retain transactional behavior and preserve existing exercise
prescriptions. Delete checks current self entitlement in SQL, while retaining
safe removal under medical restrictions and valid missing-item no-ops.

Permission loss prevents changes and returns 403. Coached clients still cannot
choose or edit their assigned program through these endpoints. No migration or
new consent policy was introduced; this preserves the existing plan-edit policy.

Verification: ten of eleven baseline cases failed before the fix. All 538 tests
and TypeScript pass. Cases inject expiration, mode change, intake incompletion
and medical review immediately before upsert/template persistence, plus delete
revocation and safe removal. Existing template retry/non-overwrite coverage passes.
Production build/package runs through Sites. Browser/live D1 QA remains open.
