# Current notification consent and unread permissions

Notification assembly now lives in a testable store; the authenticated route
retains private JSON delivery. After personal appointment/program/check-in
reads, one final SQL statement checks latest notification consent and computes
unread messages with current staff role, connection, channel scope and grants.
Disabled explicit staff records override configured clinician fallback.

Access loss removes foreign unread counts. Notification consent withdrawal or
an outdated consent revision returns enabled=false with no items. Own message
history and read markers remain usable after staff connection revocation.
No schema migration or external notifications are added.

Verification: 20 of 21 new tests failed before the fix. All 475 tests, TypeScript
pass after it. Cases cover four staff roles, scopes, connection/disablement/role,
clinical grants, same-time consent row ordering and owner history/read markers.
This checks authorization at response assembly, not a transactionally consistent
snapshot of all personal reminder data. Browser/live account QA remains open.
Production packaging runs through Sites.
