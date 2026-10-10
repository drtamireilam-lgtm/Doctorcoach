# Workout required-consent persistence guards

New workout creation now checks required current-revision terms/privacy/health/
team consent before and inside its insert, in self and coached modes. Set,
substitution, next-load and effort-scale edits check consent before and inside
their update. Next-day followup now checks consent inside its update too.

Consent loss blocks new data with 403. Finish/cancel remain possible and owner
history stays readable. Retrieving an existing request/active workout remains a
read-only retry; the change does not automatically clear a medical restriction.
No schema migration. Legacy synthetic training fixtures now seed the required
consents so valid-training tests represent authorized users.

Verification: 28 of 29 baseline cases failed before the fix. All 567 tests and
TypeScript pass. New tests cover all four required consents, two start modes,
four active-edit actions, next-day followup and closing after withdrawal.
Existing another-owner 404 behavior remains intact. Production build/package
runs through Sites. Actual browser/live account journeys remain unverified.
