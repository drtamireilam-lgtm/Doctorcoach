# DoctorCoach — Production Backend Readiness

The frontend currently uses local persisted MVP adapters. This is suitable for product development only and is **not** the production clinical-data or payment architecture.

## Backend domains now defined

The codebase includes a production-facing backend contract for:
- athlete profiles
- injury episodes
- medical reviews and restrictions
- training programs and versions
- workout sessions and exercise sets
- rehabilitation records
- readiness and pain responses
- outcome measures
- body weight
- nutrition plans/check-ins
- team notes
- appointments
- subscriptions
- consents
- audit events
- private media uploads
- checkout creation

## Required before real patient/client data

1. Production identity provider and server-side sessions/tokens.
2. Server-enforced role and athlete-scoped access control.
3. Persistent database with migration/versioning strategy.
4. Separate staging and production projects.
5. Encryption in transit and at rest.
6. Private object storage for training videos and medical documents.
7. Signed short-lived media access URLs.
8. Append-only audit events for sensitive reads/writes/approvals/exports.
9. Consent versioning, withdrawal and retention workflows.
10. Backups plus tested restore procedure.
11. Error monitoring and security logging.
12. Legal/privacy review for the intended jurisdiction and data flows.

## Payment requirements

The UI now models MEDICAL one-time checkout plus SELF/COACHING/NUTRITION subscriptions, including nutrition 1/3/6/12-month durations. No real payment is processed yet.

Production payments require:
- provider account and product/price IDs
- server-created checkout sessions
- webhook signature verification
- idempotent webhook processing
- server-side entitlement state
- cancellation/refund handling
- invoices/tax configuration as applicable

Never unlock a paid entitlement based only on a browser redirect or client-side state.

## Recommended architecture boundary

Keep the frontend dependent on the `DoctorCoachBackend` interface rather than provider-specific SDK calls throughout the UI. A production adapter can then be selected without rewriting the product domain.

The production adapter should be added only once a backend/identity/payment stack is explicitly selected and configured.
