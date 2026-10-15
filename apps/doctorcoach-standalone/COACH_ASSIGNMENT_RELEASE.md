# Coach-controlled assignment release — 2026-10-04

## Source boundary

This release updates the existing hosted Sites application, based on source
`070fd7d645a1a1654972878a8d9720e1348a491b`. It preserves Sites authentication,
Cloudflare D1/R2 storage and existing training, onboarding and team workflows.
It does not replace this application with the separate GitHub Vite prototype,
import its demo data, or enable the pending Supabase integration.

## Changes

- Only an active, consent-linked coach can publish the athlete's active plan.
- Coach submission creates the plan, selects it and writes an audit event in
  one database batch. Role, relationship, intake, medical-review and active-workout
  guards are rechecked inside the batch.
- Trainees cannot activate an old or arbitrary coaching plan, including through
  the old API action. Their care view shows only the currently assigned plan.
- The server never falls back to a historical plan when the assignment pointer
  is missing or its coach relationship has been revoked.
- Retries of an old submission do not reactivate it or duplicate the audit.
- Running workouts block replacement; completed training history is retained.
- The paid independent mode remains separate and retains its entitlement checks.

No new database migration, staff grant, account or subscription was created.
Existing assigned pointers remain valid. Previously sent but unactivated drafts
must be resent by the coach as a new assignment; the trainee cannot activate them.

## Verification

Run `node --experimental-strip-types --test tests/*.test.mjs` and `npm run typecheck`.
The added SQLite-backed tests cover immediate assignment, old retries, direct
API denial, pointer loss, revoked consent, atomic rollback and mid-request revocation.
Existing RPE/RIR, next-set load, privacy, onboarding, membership and clinical tests
remain part of the suite. Hosted browser QA with distinct real users remains
pending; automated store tests are not a substitute for that check.

## Not completed by this release

All Master Plan work is not complete: production legal/clinical approval,
full browser acceptance tests, full multi-day versioning, coach-approved
substitutions, payment-provider automation and the separate GitHub/Supabase
track still require follow-up. Do not describe this as a fully launched clinical product.
