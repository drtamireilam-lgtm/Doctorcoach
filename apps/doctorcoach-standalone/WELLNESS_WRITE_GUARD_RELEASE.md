# Atomic professional wellness write authorization

Reproduced a connection-revocation race: a professional episode insert or update
could commit after access was revoked, then fail during the response's bundle
authorization. Returning an error did not prevent the persisted unauthorized
change.

Professional episode, return-plan, nutrition-plan and weekly-review writes now
include current access in the INSERT/UPDATE predicate: active care connection,
appropriate medical/nutrition grant, current staff role and active staff state.
Configured clinician fallback is permitted only when no explicit staff row
exists; an explicit disabled or changed-role row overrides the fallback.

Rejected writes recheck authorization before idempotent/conflict handling.
Permission loss returns 403, while competing edits remain 409. Blocked writes
cannot advance a record version or fire the atomic return-history triggers.
Owner-authored personal reports remain independent of staff connections.

Verification: TypeScript and 169 tests passed. Three new test groups exercise
40 insert/update races across all four professional record kinds, plus retries,
stale writes and personal reports after staff revocation. Initial tests reproduced
persisted unauthorized inserts/updates before the fix; the fixed tests compare
the complete saved row and revision history. Build runs during publication.

Boundary: API health-consent checks remain before store execution; atomic consent
withdrawal/revision handling is a separate next verification item. No schema
migration or clinical rule change. Browser and production-account flows remain
unverified.
