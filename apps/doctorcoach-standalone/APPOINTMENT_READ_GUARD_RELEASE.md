# Appointment management read authorization

Coordinator management listings now require the active coordinator role inside
the appointment query as well as current coordinator connections. After service
enrichment, one SQL snapshot validates the role and all captured client links.
Access loss discards the response with 403, including role loss on an empty list
or one revoked client in a multi-client list.

Personal history remains owner-scoped. Configured appointment administrators
retain their independent management permission. Existing payment link visibility
and catalog enrichment rules are preserved. No schema change or payment-provider
operation is added.

Verification: six of eight new cases failed before the fix. All 483 regression
tests and TypeScript pass after it. Production build/package runs through Sites.
Actual browser/live account journeys remain unverified. This guards response
authorization rather than providing a transactional snapshot of appointment and
service data.
