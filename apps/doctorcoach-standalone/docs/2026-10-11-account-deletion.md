# Account deletion execution infrastructure

## Safety / activation

Execution is **disabled by default**. Do not enable `DOCTORCOACH_ACCOUNT_DELETION_ENABLED=true` until the service operator approves retention policy (including the minimal receipt), lawful processing of health records, external providers, billing cancellation and backup handling. No production deletion was performed while building this feature.

The implemented path is full deletion for a verified trainee request with **no retention hold**. It is not a medical-record retention archive. If any legal, clinical, financial or other hold applies, leave execution disabled / do not execute the request; a separate restricted retention workflow must be designed and approved. No retention duration has been invented.

## Workflow

1. User submits authenticated, explicitly confirmed request in Privacy or `/account-deletion`. Authenticated email is recorded for verifying that staff / admins are not purged.
2. Admin opens `/account-deletion-admin?request=<receipt>` from team dashboard. Preview returns counts, not clinical content or file download keys.
3. Execution requires an admin identity, enabled runtime flag, typed exact request ID, no-hold attestation and completed external-provider / backup review.
4. A D1 transaction creates a minimal deletion operation receipt, removes consents, team links and push registrations. Database triggers block inserts and updates for owned records, including late/in-flight writes. Normal app authentication denies locked accounts; the isolated privacy endpoint can still return their own operation receipt.
5. Remove exact owned R2 keys and per-asset UUID prefixes, including old upload attempts. Never delete an entire bucket or broad prefix. A missing bucket, malformed key or storage error stops execution; metadata remains for retry.
6. D1 transactional purge removes owned account records and relational dependents, then marks receipt deleted. Database failure rolls back the record purge and can be retried even if files were already removed.
7. Receipt status remains available on the deletion page. Receipt contains account ID, request ID, reviewer ID, status and timestamps only. It is still user-linked data, not anonymous data. Receipt retention must be approved. This is not deletion of ChatGPT identity or automatic cancellation of third-party subscriptions.

## Data scope

`lib/account-deletion.ts` contains the explicit table ownership registry. It covers profiles/intakes, medical and wellness data, workouts, team notes/programs/check-ins/messages, favorites, feedback/stories, appointments, membership and mock billing records, consent and audit events, notification records, documents/videos and their related rows. Shared catalogs, anatomy/exercise content and staff identities are not purged. Staff/admin account deletion requires a separate reviewed process.

Migration `0022_account_deletion.sql` is appended after existing custom Web Push migrations. Drizzle generated the account schema/metadata; write-barrier triggers were appended to the new unapplied migration only. No old applied migrations were changed.

## Verification / limits

Automated tests cover direct table scope, isolation from other users, files, dependent rows, authentication guard, staff protection, mandatory confirmation, disabled execution, legal holds, storage/database failures, safe retry, recreation prevention and denial of ordinary dashboard completion for deletions.

No browser/device QA: managed Sites workflow has no control-browser available. No real account was deleted. Infrastructure-provider historical backups/logs are not purged by this code; their approved handling is a prerequisite for enabling execution. Store readiness is not claimed.
