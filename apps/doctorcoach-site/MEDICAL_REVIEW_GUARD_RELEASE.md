# Atomic clinician medical-review decisions

Medical decisions now require an active clinician care connection, medical
access and all current required consents at persistence time. Explicit inactive
or changed-role staff records override configured clinician fallback.

A transactional D1 batch conditionally creates a unique audit receipt for the
current open review version and applies the decision using that receipt. Audit
or update failures roll both statements back. Stale decisions create no audit
and cannot overwrite new medical flags. Authorization/consent failures return
403; competing versions return 409. Clearance remains an explicit clinician
decision, while in-review continues blocking training.

Verification: TypeScript and all 195 tests passed. Eleven new tests exercise
connection/scope/grant/role revocation, consent withdrawal/revision changes,
both rollback directions, new flags, stale retries and exactly-once successful
decision audit records. Production build is checked during publication.
Browser/mobile and actual trainee/clinician account flows remain unverified.
