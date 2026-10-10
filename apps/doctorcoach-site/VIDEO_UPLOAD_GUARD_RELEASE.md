# Video upload and publication guards

Review uploads now require current required/media consent and an active care
recipient. Initialization and finalization check these permissions inside SQL;
demo writes check the captured active staff role, with configured clinician
fallback only when no explicit staff row overrides it. Demo publication still
requires explicit rights confirmation.

Initialization enforces per-owner/kind quotas atomically (30 review, 300 demo)
and compares exact owner/kind/exercise/caption/mime/size/session/set on retries.
Linked sessions must still belong to the uploader and contain that exercise/set
when saved or finalized. Deleted assets cannot be restored through finalization.
Existing writable/ready retries also require current upload permissions.

The PUT route writes each attempt to a unique R2 object. Only the winning SQL
finalization selects its object key. Rejected or losing attempts delete their
own object, preserving the winner. Cancellation/removal remains owner scoped.
There is no schema change in this release.

Verification: TypeScript and all 297 tests passed. Twenty-three new cases cover
initialization/finalization consent and connection races, disabled staff,
role/scope changes, quota concurrency, exact metadata conflicts, linked session
ownership, deleted assets, publication and upload cleanup. Storage orchestration
tests use an in-memory bucket with the actual SQL store, including concurrent
attempts and database failure; they do not claim live R2 verification.
Production build runs during publication. Browser/mobile and actual account
and storage verification remain outstanding.
