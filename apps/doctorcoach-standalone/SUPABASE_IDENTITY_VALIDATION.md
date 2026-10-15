# Supabase identity adapter — isolated preparation

2026-10-11. Initial source preparation is described below; the follow-up section
records the deployed isolated provider integration. No Sites route imports this
adapter. No email was sent or real user migrated.

## Implemented contract

`lib/supabase-identity.ts` adds an email-OTP-only server verifier compatible with
`verifyIdentity` and the identity mapping core. It rejects malformed tokens,
wrong issuers/audiences/roles, anonymous users, expired/future tokens and missing
session identifiers. Decoding is a rejection filter and NEVER verifies a signature.
The exact token must be accepted by a trusted Supabase `getUser` call; the returned
user must match its subject, be non-anonymous, have confirmed email and not be banned.

A second, mandatory trusted `checkSession` callback must verify the session belongs
to that user, still exists and satisfies provider time-box/inactivity settings.
Missing configuration fails at construction; errors/revocation deny access. This
callback was initially an integration prerequisite; the follow-up section
describes its staging implementation. It is not a production integration. Do not expose auth.sessions, create a public session RPC, or put service-role
keys in mobile/browser code. No permissive fallback is allowed.

The included server REST transport pins an HTTPS project URL, uses a publishable
key, calls `/auth/v1/user`, rejects redirects, has an eight-second timeout, disables
caching and returns generic errors. It does not persist or log tokens. Dependencies
must be wired exclusively from trusted server configuration, never request JSON.

Recent authentication derives from `amr`'s OTP timestamp, not the issue time of a
refreshed access token. Old OTP proof remains old; the mapping core enforces its
10-minute linking limit. Recovery, refresh and MFA alone cannot satisfy this phase.
Neither email nor user metadata grants account ownership, clinical roles or payments.

## Local verification

26 new tests exercise provider acceptance/rejection, exact-token forwarding, session
revocation/failure, subject mismatch, unconfirmed/anonymous/banned users, issuer,
audience, role, time claims, old authentication after refresh and transport errors.
Provider and session responses are simulated. These tests do not prove real Supabase
signature validation, production revocation, SMTP delivery, OTP replay/expiry,
native secure storage or an independently reachable mobile backend.

Run `node --experimental-strip-types --test tests/supabase-identity.test.mjs`,
`npm test`, `npm run typecheck` and `npm run build`.

## Next concrete integration

1. Establish a separately reachable staging backend with pinned provider issuer and
   server-only session validation. Current Sites authentication remains owned by
   the hosting platform; an external token must not bypass its existing helper.
2. Inspect provider Auth settings and configure business SMTP/verified sending domain.
   The discovered project is available, but SMTP, email template, auth policies and
   designated test-user configuration have not been verified by the available API.
3. Use explicitly designated synthetic test accounts. Send and verify an email code,
   exercise wrong/expired/replayed codes and rate limits, then verify logout revokes
   access via the trusted session query even before JWT expiry.
4. Only after these pass, wire the adapter to the isolated mapping flow and run the
   legacy/external ownership and collision tests against the staging database.

This checkout contains preparation, not a release-ready external login. There is no
email OTP UI/endpoint, refresh-token store or native bundle in this change.

Official references checked:
- https://supabase.com/docs/guides/auth/jwts
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/guides/auth/jwt-fields
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/auth/auth-smtp

## Follow-up: deployed staging integration (2026-10-11)

The discovered Supabase project `nlnyvrbejaqzdbekwlgi` had zero Auth users and
sessions. Its public Auth settings were read successfully: email enabled,
signups enabled, automatic email confirmation disabled, anonymous sign-in disabled.
Public settings do NOT reveal SMTP credentials/configuration, delivery readiness,
email OTP template or session configuration. No administrative Auth settings tool
is available in the current connector. Those items remain unverified.

An additive `doctorcoach_staging_session_check` provider migration now installs:
- A private-schema, empty-search-path definer function bound to `auth.uid()` and
  `auth.jwt()`; checks owner/session, token expiry, confirmed non-anonymous user,
  deletion/ban and provider `not_after`.
- Explicit staging limits of 24h maximum lifetime and 1h since refresh/creation.
  These are local test policy, not a statement about the project's configured Auth
  limits. Reconcile stricter provider limits before production use.
- A public invoker wrapper returning only a boolean, without input arguments.
  Only `authenticated` can execute; anonymous/PUBLIC have no execute grant.
  No grant exposes `auth.users` or `auth.sessions` rows.

`lib/staging-identity-endpoint.ts` wires the exact access token into the trusted
Auth call and PostgREST RPC. It is deployed as `doctorcoach-identity-staging`,
Edge Function version 1. The runtime reads provider-owned public keys; it never
uses a service-role key. Legacy anon key compatibility is pinned to the project
and rejects service-role keys. No route in the Sites app imports this endpoint.

The function uses `verify_jwt=false` because its handler implements the full custom
verification chain (pinned Auth server + live session RPC); that setting is NOT
permission for anonymous access. POST requires a bearer proof; unsupported methods
are denied. No CORS/browser login UI, email send endpoint, clinical data, account
mapping write or refresh-token persistence was added.

Real provider checks:
- Synthetic SQL users/sessions were created inside a transaction. Active session
  succeeded under the authenticated DB role; expired/inactive/old sessions, another
  owner, banned/unconfirmed/anonymous user, revoked session and missing claims were
  rejected. Anonymous execute grants were checked. All fixtures were rolled back;
  user/session counts returned to zero. This tests SQL logic, NOT issued JWTs.
- HTTP POST to the deployed Edge Function without proof returned 401; a synthetic
  forged JWT returned 401. Anonymous RPC returned 401; Auth rejected the synthetic
  JWT with 403. These are rejection checks, NOT successful real OTP sign-in.
- Supabase security advisor returned no notices.
- All 748 local tests, TypeScript and production build passed.

## Remaining blocker and exact next action

SMTP delivery and a real successful issued-token/session round trip are incomplete.
No email was sent and no test user remains in the project. Configure a mail provider
and verified sender in the project's Auth email settings, using its secure dashboard:
https://supabase.com/dashboard/project/nlnyvrbejaqzdbekwlgi/auth/templates
Use the SMTP settings in that dashboard, set the email template to display the OTP
(`{{ .Token }}`), and confirm applicable send/rate limits. Do not paste SMTP passwords
or secret keys into chat. A designated test email address is also needed before a
real code is sent. Once configured, exercise correct/wrong/expired/replayed code,
then logout and recheck the same access token against this Edge Function. Native
phone sign-in and Sites ownership migration remain later acceptance tests.
