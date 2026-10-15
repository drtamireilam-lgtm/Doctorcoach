# DoctorCoach independent Worker — staging implementation

Base: Sites version 171, commit `ce4cba9f3e5c703bf84b801e05491070a00fe947`.
This is executable server code with synthetic integration tests, not a deployed
independent service. The current Sites app remains on `worker.ts`.

## Build and runtime

Build with `DOCTORCOACH_STANDALONE_BUILD=1` using the normal build command.
The Vite Worker entrypoint becomes `worker.standalone.ts`; Sites mock sign-in
and Sites publication metadata are omitted. A normal build retains `worker.ts`
and the original Sites metadata. Never deploy a standalone artifact through Sites.

The generated Wrangler configuration STILL contains local placeholder storage
bindings. It is not deployable as a real data environment. An independent
Cloudflare account and verified actual D1/R2 bindings are required first.
Netlify alone cannot run the current Worker with D1/R2 bindings.

Required runtime variables (values do not belong in source):

- `DOCTORCOACH_APP_ORIGIN`: exact HTTPS staging origin, without trailing slash.
- `DOCTORCOACH_AUTH_PROJECT_URL`: pinned Supabase project root URL.
- `DOCTORCOACH_AUTH_PUBLIC_KEY`: public/publishable key; secret/service-role keys rejected.
- `DOCTORCOACH_LEGACY_IDENTITY_ISSUER`: the issuer used by the proven legacy mapping.
- `DB`, `BUCKET`: independently controlled staging D1/R2 bindings.

The existing application still reads its normal admin, clinician, billing, push
and calendar runtime settings. Do not copy privileged settings into staging
until their staging recipients and providers are configured.

## Authentication behavior

Existing sign-in links open an email-code form in the standalone Worker.
Sending a code does not create an Auth account. The provider must have email
OTP templates configured to include `{{ .Token }}` (default Magic Links alone
do not supply the code UI). Supabase Auth's rate limits and delivery/SMTP
configuration must be verified before user testing.

Every access proof is checked by Auth's `/user` endpoint and the existing
`doctorcoach_staging_session_active` RPC. This is intentionally staging policy:
24-hour session lifetime and one-hour refresh inactivity. Do not rename it or
assume it is an approved production session policy.

The verified external identity must resolve through the identity-mapping tables.
No matching by email, account creation, automatic linking or role assignment
occurs on login. Unlinked accounts are denied without changing existing data.
Existing deletion journals and barriers are checked before application access.

Access/refresh cookies are Secure, HttpOnly, SameSite=Strict and host-scoped.
Refresh is an explicit POST via the login screen; there is no automatic browser
refresh loop in this implementation. Sign-out requires a same-origin POST and
revokes the provider session. Provider failure is reported instead of claiming
revocation succeeded. Refresh-only sessions can also be revoked.

All caller-supplied Sites identity headers are removed. Only the server-derived
mapped owner and verified Auth email enter the shared application. Session
cookies and incoming Authorization are not forwarded to application handlers.
Cross-origin mutations and oversized authentication forms are rejected.

## Storage and account migration — still required

`identity-schema.sql` is tested against synthetic SQLite/D1 fixtures only.
Apply it once to independent staging after taking a backup, never to the current
Sites database as an automatic step. It creates no application or medical data.

No supported direct binding/export of the Sites-managed D1/R2 resources into an
external Cloudflare account has been established. Provision controlled staging,
establish a supported export/restore or verified bridge, and validate schema,
row counts, owner IDs, file hashes, deletion journals and restoration before
moving any user. Do not replace existing data with the empty Supabase tables.

Legacy account linking requires both authenticated identities and explicit
confirmation using the existing mapping module. A supported proof of recent
legacy authentication is still needed; do not manufacture a primary-login
timestamp from the current request time. No real account was linked here.

## Validation performed

- Full test suite: 1,067 passed, 0 failed.
- TypeScript: passed.
- Independent production build: passed; standalone gateway present, Sites metadata absent.
- Original Sites production build: passed; standalone gateway absent, Sites metadata present.
- Deployed Supabase staging verifier: forged token rejected with HTTP 401.
- No real OTP sent, no real identity linked, no production rows read or modified.
- No independent deployment, DNS change or phone/browser end-to-end login test performed.

Next: authenticate hosting administration, provision/identify controlled staging
storage, validate export/restore and linking proofs, configure email delivery,
then exercise real login/refresh/logout, cross-user access and the first workout.
Connect `app.drtamireilam.com` only after these checks pass.

## Restore this checkpoint

This GitHub branch stores a patch, not a replacement application checkout. Restore the canonical Sites source at commit `ce4cba9f3e5c703bf84b801e05491070a00fe947`, then apply `implementation.patch` with `git apply --check` followed by `git apply`. Do not apply it to the older Vite app in GitHub main. Local implemented commit: `1ac00c7` (plus preceding identity adapter commit `58f59b2`).
