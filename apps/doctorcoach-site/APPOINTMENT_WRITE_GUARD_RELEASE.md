# Appointment update persistence guards

All staff appointment transitions now check the current active coordinator
connection, coordinator scope and staff role inside the UPDATE. This covers
scheduling, cancellation, follow-up, completion, payment verification and
refund verification. Server-configured administrator access is preserved.

Scheduling atomically checks that the service remains public, its price is
confirmed and price/duration/provider still match the appointment snapshot.
Existing overlap protection remains in the same statement. Writes also match
the client, captured state/payment state and optimistic version. Failed staff
authorization returns 403; competing edits or service changes return 409.

Owner cancellation/payment reporting remains owner scoped; cancellation stays
available after team revocation. Payment/refund confirmation still requires
explicit staff verification and reference rather than automated confirmation.

Verification: TypeScript and all 239 tests passed. Thirty-two new tests cover
six staff transitions across four revocation types, five service changes,
competing updates, owner cancellation and authorized payment attribution.
Production build runs during publication. Browser/mobile and actual account
verification remain outstanding. Appointment creation is the next audit item.
