# D1 rollback and account deletion recovery

Deletion remains disabled in production. This change adds no clinical retention period and does not authorise deletion.

## Implemented
- Before any file/data purge, write and read back a minimal R2 receipt under privacy-deletion-journal/v1/<SHA256-user-id>.json.
- Receipt contains version, account ID, request ID, reviewer ID and start timestamp only. It remains personal data; approved retention is still required.
- R2 is separate from D1 rollback, but is not independent of bucket deletion, lifecycle expiration or a simultaneous R2 rollback. Exclude this prefix from client-file deletion, automatic expiry and ordinary media backup restoration.
- On authenticated requests, look up the R2 receipt and reconstruct a missing D1 access/write barrier. Missing/unavailable binding or invalid journal denies private sign-in access rather than ignoring the journal. This adds a storage read to authenticated requests.
- Admin-only POST /api/privacy/recovery with {confirmed:true} imports one page of receipts as deleting barriers. Pass nextCursor back as cursor until complete=true. The endpoint never purges files or medical data.
- Existing deletion endpoint can resume each imported request ID only after the existing explicit no-hold/provider/retention confirmations and production enablement. Resume IDs must be taken from the restricted operational journal; recovery does not make medical retention decisions.

## Recovery runbook — mandatory before reopening
1. Isolate private traffic and pause scheduled/background dispatch at the hosting layer before D1 restore. Do not rely on individual trainee login checks: staff reads and background dispatch can otherwise see restored data.
2. Protect/copy the current journal using an approved restricted operational process outside the D1 snapshot. Verify its completeness. No export to source control.
3. Restore D1 only in the authorised recovery window. Never roll back the journal with the media files.
4. Use the admin recovery endpoint, following every nextCursor. Keep maintenance isolation until all pages complete. An error or partial response is not successful completion.
5. Review each affected account and reapply approved deletion/retention decisions. Full purge remains barred if any legal hold applies. Journal conflicts or staff-account anomalies require investigation.
6. Verify team access, push suppression, dependent write barriers, provider handling and file copies with synthetic data. Open traffic only after restored accounts and related records have been dealt with.
7. Record operator, restore point, page results and approval for reopening without copying clinical content.

## Limits
Hosting maintenance isolation and automatic external backup reconciliation are operational prerequisites, not automated by this change. No production restore or deletion was performed. Provider historical logs, independent exports, R2 lifecycle settings and the actual D1 recovery window remain unverified. The journal cannot prevent someone with infrastructure permissions deleting it. Browser QA is unavailable in this environment.
