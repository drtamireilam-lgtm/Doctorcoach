# Google and Apple account sign-in — LAB

## Implemented

The existing standalone gateway now supports Google and Apple via Supabase PKCE. Email OTP remains available. No new dependency or schema migration is required.

- `POST /auth/providers`: same-origin JSON request; returns only Google/Apple enabled booleans from the pinned Supabase settings endpoint. Missing/unavailable settings fail closed.
- `POST /auth/oauth/start`: allows only Google/Apple, requires the existing same-origin JSON protections, checks availability, applies an IP rate limit and sets encrypted browser-bound PKCE state.
- `GET /auth/oauth/callback`: exchanges one authorization code with the pinned Supabase token endpoint using the encrypted verifier, validates the exact token/user and active Supabase session, and creates the existing opaque application session. Neither access nor refresh tokens are returned to the browser.
- The temporary `__Host-dc_oauth` cookie is Secure, HttpOnly, SameSite=Lax and expires in ten minutes. AES-GCM additional authenticated data binds it to the application origin. Supabase manages the upstream OAuth `state`; PKCE binds the application's callback/code to the browser that initiated the same-origin POST.
- The normal `__Host-dc_session` cookie remains Secure/HttpOnly/SameSite=Strict. Successful replacement revokes the previous application session; cancel/failure leaves it intact. Callback state is cleared and provider authorization codes remain single-use.
- Return URLs are sanitized before storage and before redirection. Provider errors are reduced to fixed localized messages. Registration remains explicit; application identity resolution is by verified issuer/subject, never an email match or editable metadata. Reserved-email/staff protections remain unchanged.
- The low-level identity verifier remains OTP-only by default. The standalone integration explicitly opts into `otp` and `oauth` primary AMR methods; refresh/recovery/MFA do not create fresh primary-auth timestamps.
- Bilingual accessible sign-in buttons show availability honestly. Disabled providers do not become enabled during form locking/unlocking. Provider failure preserves email sign-in.

## Actual provider configuration found

Read-only inspection of DoctorCoach-Staging (`jbfkzkzcznfacsjdawmf`) on 2026-10-24 showed Google and Apple both disabled. Apple client IDs and OAuth secret were empty. Google's client-ID field contained a project label rather than an OAuth client ID. No secret was revealed, copied, generated or changed. Nonce checks and confirmed-email requirements were not weakened.

Application support alone does not activate the external providers. Real Google/Apple consent, callback, account identity and refresh/logout must be checked with an owner-authorized test account after setup.

## Owner setup handoff

Use only the LAB Supabase project. Do not put secrets in chat or Git.

1. Google: create/use a **Web application** OAuth client dedicated to DoctorCoach LAB. Configure `openid`, email and profile only; no calendar/health scopes. Add the LAB origin if required by the Google client.
2. Google authorized redirect URI: `https://jbfkzkzcznfacsjdawmf.supabase.co/auth/v1/callback`.
3. Enter the actual Google Client ID and Client Secret directly into the Google provider in Supabase, then enable it. Do not enable “Skip nonce checks” or email-less sign-in.
4. Apple: the owner needs Apple Developer configuration with Sign in with Apple, a Services ID for web OAuth, and the owner-managed signing key. Enter the Services ID and generated client secret directly into Supabase. The return URL is the same Supabase callback above.
5. Apple web OAuth client secrets expire; renew within the provider's six-month maximum. The private signing key must remain in the owner's secure key management, outside the repository.
6. Supabase URL Configuration must allow the exact application callback `https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev/auth/oauth/callback`. Do not add broad wildcard domains. The app itself uses this fixed callback and stores the final relative return target in encrypted state.
7. Test Google and Apple with a synthetic LAB account, including Apple private relay email, cancellation, refresh/logout, and preservation of an existing mapped DoctorCoach owner. Do not claim provider login works until this round trip succeeds.

Dashboard: https://supabase.com/dashboard/project/jbfkzkzcznfacsjdawmf/auth/providers

## Verification and references

Unit tests cover PKCE request shape, same-origin controls, encrypted cookie attributes, missing/corrupt/expired/replayed flows, provider cancellation, unavailable/unknown providers, explicit registration, owner preservation, session replacement/cancellation and cross-browser verifier mismatch. Existing auth, identity, permissions and OTP regressions run alongside them.

`scripts/oauth-browser-smoke.mjs` exercises the real standalone HTML/CSP in Chrome against isolated provider fixtures. Enabled-fixture screenshots are **not** proof of an active external provider.

Current documentation and changelog reviewed on 2026-10-24:

- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/social-sign-in/auth-apple
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://supabase.com/docs/guides/auth/redirect-urls
- https://github.com/supabase/auth/blob/master/openapi.yaml (PKCE `auth_code`/`code_verifier` token exchange)
- https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook (primary OAuth authentication method)
- https://supabase.com/changelog.md; recent TLS-cipher deprecation and self-hosted API_EXTERNAL_URL change were checked. This app uses hosted Supabase and modern platform TLS; neither requires a project URL/protocol change here.
