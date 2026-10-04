# Supabase account stage — 2026-10-04

Prepared from GitHub commit `94c7fc1185baa441435659cbea6f23def932fcad`. User approved upload and hosted schema changes on 2026-10-04. Migration `20261004041645_doctorcoach_profiles.sql` was applied to the existing project. No site deployment, persistent test account creation or email was performed.

## Implemented

- Official `@supabase/supabase-js` SDK pinned to 2.117.2, with `package-lock.json`; CI installs with `npm ci`.
- Password sign-in for an existing verified account and sign-out. Tokens stay in memory; no auth tokens or profile records are written to browser storage. A page reload requires signing in again. SDK refresh handles the open tab.
- An account-only Hebrew screen for display name and preferred effort scale. Explicit save, load/retry, error and conflict messages. Password inputs are cleared after submission. Old asynchronous results cannot repopulate a profile after sign-out.
- `getUser()` before every profile read/write; all database operations derive the owner ID from that verified response, not from a UI-supplied athlete ID. Anonymous accounts are rejected.
- Profile writes only allow display name and RPE/RIR. They cannot set roles, subscriptions, assigned plans, medical clearance, owner ID or the version counter.
- Local Postgres-tested schema with RLS, column-specific grants and a server-maintained version. Stale saves affect zero rows and are reported as conflicts. There is no broad staff/admin access policy.

## Runtime boundary

`VITE_DOCTORCOACH_ACCOUNT_ENABLED=true` selects the account-only surface, never the browser-local training app. Missing/invalid account configuration does not fall back to demo roles. Only an HTTPS Supabase project origin and a publishable key are accepted; secret and legacy JWT keys are rejected.

The flag defaults to false. Production remains blocked until deployment is explicitly configured and approved. Existing demo functionality is retained for explicit local/pilot modes when the account flag is off. No demo profiles are imported into Supabase.

## Applied schema and deployment boundary

`supabase/schema/profiles.sql` is the local transactional test fixture. The corresponding applied migration is in `supabase/migrations/20261004041645_doctorcoach_profiles.sql`. It adds:

- `public.doctorcoach_profiles`: account ID, display name, preferred scale, version and timestamps.
- Owner-only read/insert/update policies; no anonymous access or client delete.
- A private-schema version trigger using invoker permissions and an empty search path, with no SECURITY DEFINER functions.

The existing user-selected project `nlnyvrbejaqzdbekwlgi` had no public tables immediately before application. The migration was created with the Supabase CLI and applied after explicit approval; its filename matches the recorded hosted migration version. Hosted SQL tests used two synthetic identities and role-scoped requests inside a rolled-back transaction. No test identities or profiles were retained. The hosted security advisor reported no findings. Never make the table public to fix an access error.

## Validation

- 10 application/service regression tests passed.
- 5 RLS/concurrency cases passed inside a local PostgreSQL engine (PGlite 0.5.8; the test runner also counts the parent fixture, reporting 6).
- TypeScript and Vite build passed with freshly installed locked dependencies.
- Tests cover cross-user reads/writes, owner reassignment, version manipulation, stale updates, invalid scale, unauthenticated access, anonymous sessions and forged user metadata.
- Hosted SQL verification passed owner insert/update, version increments, stale updates, cross-user read/update/insert denial, immutable version, anonymous denial and forged metadata checks. These exercise the live grants, RLS and trigger, but are not a password-login/PostgREST/browser end-to-end test. Auth configuration, token revocation, email delivery and production deployment still need end-to-end verification.

## Deliberately not enabled yet

Signup, password recovery, staff MFA, role provisioning, consented team assignments, medical intake/history, workout persistence, clinical audit/retention, media and payments. A working account/profile surface does not make the whole product production-ready.

Next coherent step: configure a non-public test environment with the publishable key and test password sign-in and profile operations through Auth/PostgREST using two isolated test accounts before permitting real profiles. No credentials were requested or extracted for this batch. Staff grants and medical intake must be separate, consent-scoped follow-up work.

## Documentation consulted

- https://supabase.com/changelog
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security

The Supabase and Postgres skills guided owner-only RLS, least-privilege column grants, no user-editable role claims, publishable-key-only configuration and pinned SDK installation.
