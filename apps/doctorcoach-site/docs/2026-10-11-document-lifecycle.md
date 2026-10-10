# Medical document lifecycle follow-up

This extends the existing private medical documents, passport and account export. Additive migration 0019 adds one lifecycle metadata table; it does not alter or delete existing medical records. No live migration, production deployment or R2 deletion was performed.

## Working scope

My File gives authenticated owners archive, restore, deletion request and withdrawal controls with an explicit confirmation. Archived documents disappear from passport/download lists and cannot be streamed, including after an earlier permission check. Restore uses existing doctor permissions and consents; owner access to historical files remains available after consent withdrawal. Staff upload permissions do not give clinicians archive/restore powers over a patient's files.

A deletion request archives the document and enters a metadata-only queue in Settings for allowlisted technical admins. Reviewing marks the request reviewed, not erased or approved for erasure, and grants no medical content access. The owner can withdraw the request; the document stays archived until a separate explicit restore. No automatic sharing or permanent purge occurs.

Version checks and action receipts guard concurrent actions. Lifecycle/status/audit writes run in one transactional batch. Another owner's records and message-channel attachments cannot be managed through this API. User-controlled filenames are excluded from translation. New interface and error strings are included in Hebrew/English catalogs and use existing themes/layout components. Account export includes only the requesting owner's lifecycle metadata, without internal receipts or storage keys.

## Verification

Eight new automatic tests cover owner archive/restore and captured download denial, foreign/staff denial, consent withdrawal, metadata-only admin queue, non-purging review/withdrawal, explicit confirmation, message scope, duplicate/stale actions, transactional rollback and parallel action winners. TypeScript typecheck and all 668 automatic tests passed. Full build is recorded by the source packaging workflow.

Browser/phone acceptance remains blocked because the supported managed browser plugin is unavailable. No UI visual verification is claimed. Real account login has not been tested.

## Still required before operational erasure

A documented retention and erasure policy for patient-provided versus professionally documented records, authorization and exception handling, backup treatment, R2 purge/orphan cleanup and verification, account-wide deletion integration and an operational review process are still needed. No arbitrary retention duration or legal-compliance certification is claimed. This feature is reversible archive and request tracking, not completed permanent deletion. Malware scanning and backup/restore checks remain separate pending work.
