# Weekly check-in and staff reply write guards

Baseline regression tests reproduced three failures: consent loss did not block
a report insert, staff revocation did not block a reply, and changed report
content under the same ID was acknowledged as an identical retry.

Report inserts now require current required consent and an existing owner
profile inside SQL. Consent checks also occur within the store before writing.
Rejected inserts recheck the guard before retry handling. A retry must match
the ID, week, sessions, pain, function, effort and content exactly.
Different IDs or changed fields return 409 without replacing the report.

Staff replies require the active care connection, current consent and the exact
authorized staff role at write time. Loss of access returns 403 without changing
response, reviewer or timestamp. The existing unanswered-only predicate remains:
a competing valid reviewer may write once; later writes return 409.

Verification: TypeScript and all 184 tests passed. Four new groups cover all four
required consent withdrawals, owner profile disappearance, staff connection,
scope/role/active-state changes, reply consent loss, exact/changed report retries,
owner preservation and two competing authorized reviewers. Baseline tests had
three failures before the fix and all pass after it. Build runs during publication.

No schema migration, clinical rule, primary navigation or report-form changes.
Browser and production-account checks remain unverified. Other domain writes
remain separate audit items, especially clinician medical-review transitions.
