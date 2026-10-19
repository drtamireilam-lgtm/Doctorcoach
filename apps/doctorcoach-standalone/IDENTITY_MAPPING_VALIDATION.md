# DoctorCoach — identity mapping prototype validation

2026-10-11. This step implements and tests an isolated server-side mapping core.
It does not integrate Supabase Auth, send email, change Sites sign-in, deploy a
native app, create a live database schema or migrate actual user data.

## Implemented

`lib/identity-mapping.ts` maps a verified issuer/subject pair to a canonical owner
ID. Existing Sites IDs are preserved. New accounts receive server-generated IDs.
Email, display names, client JSON and self-selected roles are not mapping keys.

The core accepts only immutable proof objects produced by `verifyIdentity`.
An injected **trusted server verifier** must check provider signature, audience,
issuer, expiry and live session/revocation state before returning claims. The
core additionally checks its issuer allowlists, expiry, claim bounds and recent
authentication for linking. This is an integration contract, not a implemented
Supabase JWT verifier; no caller-facing API may accept a verifier from a request.
Provider-issued refresh/access token issue time alone must not be interpreted as
proof of recent user authentication for the linking step.

Link challenges bind both authenticated identities and the canonical account,
expire after five minutes, require explicit confirmation and store a hash of the
secret ticket. Recent authentication is required on both sides. An atomic alias
insert, operation receipt and consumption transaction prevents partial updates.
Replay, collisions and competing claims for the same external identity are
rejected. Linking to a different existing canonical account requires a separate
reviewed migration/merge process; no automatic merging is implemented.

Blocked/deleted canonical accounts cannot be restored just by a new provider
login. State is rechecked inside the linking transaction. Mapping does not grant
staff roles, change consent, create a subscription or rewrite clinical records.

## Verification

Tests use an in-memory SQLite database with the existing real app migrations and
the extra **test-only** schema at `tests/fixtures/identity-mapping.sql`. This file
is deliberately outside `drizzle/` and is not a production migration. A synthetic
HMAC token verifier exists only in tests; it is not a production identity provider.

Focused cases:

- Fabricated objects, copied proof objects and tampered signatures are rejected.
- Wrong issuer, expiry, future/invalid claims and stale authentication are rejected.
- An existing synthetic medical profile, training plan and consent history remain
  unchanged after verified linking; another account still cannot read the profile.
- Matching email addresses, subject capitalization and provider changes do not
  silently merge accounts.
- New registrations are stable across retries/parallel calls, with no orphan
  principals and no staff grants or paid entitlement.
- Confirmation, exact identity binding, hashed tickets, expiry and replay rules.
- Safe relinking to the same owner and rejection of a pre-existing different owner.
- Receipt failure rolls back alias insertion and ticket consumption together.
- Competing accounts and parallel completion produce exactly one operation winner.
- Blocked/deleted accounts remain inaccessible, including blocking between a
  pre-read and the transaction, and canonical ID collisions are rejected.

Run `node --experimental-strip-types --test tests/identity-mapping.test.mjs`, the
full test suite, TypeScript and the standard production build. These are local
synthetic checks, not verification of D1 production concurrency, provider token
validation, native secure storage, email delivery or physical-device sign-in.

## Isolation and next work

No route, Worker handler or current sign-in helper imports this module. There is
no change to hosting, environment variables, live DB/R2 or the existing user
authentication. Current site release remains 100 until an intentional release.

Follow-up source preparation now adds the Supabase adapter and server transport;
see `SUPABASE_IDENTITY_VALIDATION.md`. Its provider/session tests use simulated
responses; a trusted live session query is still required. Next test actual
email-code authentication with designated test accounts. First inspect provider configuration and
establish a supported mobile backend path. Production SMTP, verified domain,
access to a staging backend and a supported proof of legacy Sites ownership are
still prerequisites for live integration. Avoid copying account identifiers or
using matching email addresses as a substitute for that proof.
