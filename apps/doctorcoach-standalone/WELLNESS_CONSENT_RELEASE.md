# Atomic consent enforcement on wellness writes

Reproduced a race where withdrawal after the API's initial consent check did
not prevent a wellness insert/update. Consent enforcement now lives in the store,
with an early check and the same SQL predicate inside every INSERT/UPDATE.
Professional permission guards remain in the write predicate as well.

The shared health-consent guard requires the latest terms, privacy, health and
team decisions to be accepted at the current consent revision. Ordering uses
created_at descending, then rowid descending to distinguish same-time decisions.
Missing, withdrawn or outdated latest consent cannot fall back to an older
acceptance. Decisions from another account cannot authorize the target client.

Failed writes recheck current consent before conflict/idempotent handling:
identical retries after withdrawal return 403 rather than successful responses.
Record versions and return-history snapshots remain unchanged. Renewed current
consent permits later writes. Existing authorized reads remain available.
The API delegates consent enforcement to the store rather than duplicating it.

Verification: TypeScript and all 173 tests passed. Four new groups cover 36 insert
withdrawal races across nine kinds, 18 update/retry races, revision/missing/same-time
and other-account cases, direct-store enforcement, renewal and retained reads.
Initial tests reproduced the unprotected behavior. Existing fixture users who
completed the connection flow now include explicit valid required consent;
an ownership test separately grants consent to isolate its cross-account check.
Production build runs during publication.

Boundary: this batch protects wellness records. Other domain writes need their
own audit; no claim of global atomic consent enforcement. No schema migration,
automatic deletion, clinical rule or consent-screen changes. Browser/live-account
and production D1 behavior remain unverified.
