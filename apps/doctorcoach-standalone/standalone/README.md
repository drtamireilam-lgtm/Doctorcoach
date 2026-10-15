# DoctorCoach standalone candidate — NOT deployed

## Provenance and isolation

This is the full 779-file v171 source, commit
`ce4cba9f3e5c703bf84b801e05491070a00fe947`, plus isolated additions below.
It is NOT the Vite app in GitHub main, and is NOT the old v90 app snapshot.
The supplied deployment audit was read. `DoctorCoach_Standalone_Preparation_v171.zip`
could not be found by exact or simplified Library search or recent Library listing;
no claim is made that its additional preparation files were inspected.

`pilot.drtamireilam.com`, Netlify `transcendent-donut-464e0f`,
`feature/pilot-registration`, its base/build/publish settings, and the live Sites
app are unchanged. No DNS, remote database, users, authentication template or
production secrets have been changed. This source is a candidate, not a live app.

## Chosen runtime

Vinext + the installed Cloudflare Vite plugin on Cloudflare Workers. The existing
D1 and R2 API contracts remain in use; Supabase handles email-code identity only.
Do NOT substitute the empty Supabase profile tables for the original D1 tables.
The Vite config selects this runtime only with `DC_BUILD_TARGET=standalone`.
Without that variable the original Sites build path is retained.

Build from the app directory:

```
npm run build:standalone
node standalone/scripts/runtime-smoke.mjs
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test --test-concurrency=4 tests/*.test.mjs
node standalone/scripts/deployment-gate.mjs standalone/evidence.json
```

The last command intentionally exits 2 until ALL external/runtime/browser/data
preservation evidence is present. It is an evidence checker, not an authorization
mechanism or deployment system. No auto-deploy workflow is installed. The
placeholder D1 UUID, disabled workers.dev and empty domain routes are deliberate.
Never deploy this placeholder config or enable routes against an empty database.

## Identity boundary

- Email OTP is verified by Supabase `/auth/v1/verify`; each request checks the
  exact token with the provider's `/auth/v1/user` and the session-active RPC.
- Email and role are never taken from editable user metadata or browser headers.
- Browser cookies hold random opaque session IDs. Tokens are encrypted in D1 with
  AES-256-GCM, authenticated against that session's ID hash. Keys are Worker
  secrets. No provider token is returned to the browser or put in localStorage.
- All incoming `oai-authenticated-*` headers are removed before the old API
  handlers run. Only the standalone entrypoint may inject a verified principal.
- Same-origin POST is required for authentication and existing API writes.
  Cookies are host-only, HttpOnly, Secure and SameSite=Strict. GET never logs out.
- Maximum session lifetime 12 hours; idle timeout one hour. Expiring provider
  tokens are refreshed server-side, using a unique CAS lock. Refresh races cannot
  consume the same refresh token twice or resurrect a locally revoked session.
- Signup is explicit and defaults OFF. Before enabling it, import a complete
  verified reserved-email inventory and reserve ALL configured privileged emails.
  Reservation only denies accidental duplicate creation; it NEVER maps an owner.
- New users get `dc:<uuid>` IDs. Existing users retain their EXACT old owner ID.
  Account deletion and R2 deletion journal guards remain in the original adapter.

## Existing-account linking

Email equality is NOT a linking mechanism. A current OTP session obtains a fresh,
signed external-subject proof at `/auth/link/start`. The candidate
`legacy-bridge.ts` is meant to run inside the OLD trusted Sites server, after
its existing authenticated-user check and explicit same-origin confirmation.
It validates the external proof and signs a five-minute proof containing the
old principal ID, canonical email, exact new Supabase subject and target origin.
`/auth/link` verifies that proof and consent, consumes a one-use nonce, and
adds an alias to the ORIGINAL owner. No clinical rows or object keys are rewritten.

There is NO installed old-side route/UI yet; the candidate bridge is tested in
isolation only. Install and review that bridge separately only after the required
checks pass. Never expose a public endpoint that trusts raw old-user headers.
Someone unable to sign into the old account needs a separate audited recovery
process; do not resolve it by matching their email or by blindly merging accounts.
Choosing “new account” before linking cannot later merge that account with an old
one; the user must use a fresh unassigned identity or audited manual recovery.

## Supabase staging setup (not applied to the existing project)

Use a separate test project or approved isolated environment. The existing
`nlnyvrbejaqzdbekwlgi` also serves the Netlify pilot and must not have its auth
settings changed as part of this candidate.

Set an email-only OTP template containing `{{ .Token }}`, 6-digit codes,
10-minute provider expiry, minimum resend interval 60 seconds and approved SMTP.
Verify delivery to controlled test recipients, wrong/expired/replayed codes,
provider refresh and revocation in that environment. The session-active RPC must
run from the verified JWT, use no caller-supplied subject/session IDs and deny
expired, banned, deleted, anonymous or revoked sessions. The already-inspected
staging RPC implements that contract, but must be installed/reviewed on the chosen
new environment, with safe search_path and minimum execute grants.

Do not use a service-role key in this Worker. Provider public keys are public;
private session-encryption and linking signing keys are server secrets.

## Worker configuration and secure access

Required bindings: `DB` and `BUCKET`, both isolated for staging. Required vars:
`DC_AUTH_ORIGIN`, `DC_LEGACY_ISSUER`, `DC_SUPABASE_URL`,
`DC_SUPABASE_PUBLIC_KEY`. Required secrets: `DC_SESSION_KEY` (32 random bytes,
base64), `DC_LINK_PRIVATE_JWK` (Ed25519 private JWK). Pin the OLD bridge's public
key in `DC_LEGACY_PUBLIC_JWK`; its private key stays only in the old server.
Pin the standalone linking public key in the old bridge.

Wrangler was checked and is NOT authenticated to the owner's Cloudflare account.
Use secure OAuth login on an authorized computer/session. Never paste account
passwords, session cookies, refresh tokens or private API keys into chat.

## Data transfer and go-live blockers

1. Obtain an authorized consistent export of the actual managed D1 and ALL R2
   objects, including deletion journals, drafts, private documents, videos, HTTP
   metadata and custom metadata. No such production export has been obtained.
2. Restore into isolated targets first; preserve original IDs, schema, rows,
   consents/revisions, scopes, subscriptions, payments, workouts and object keys.
   Apply ONLY `standalone/migrations` after restoring the old schema/history.
   Running the entire legacy migration directory against an already restored DB
   is wrong. Creating a fresh empty schema is not a production migration.
3. `snapshot.mjs` compares every legacy table's schema/content hashes and every
   local exported object byte hash, without printing medical content. The file
   comparison alone does NOT verify R2 metadata; a separate metadata comparison
   and actual D1/R2 restore rehearsal are still required. Frozen source tables
   must match before allowing target writes.
4. Install the old-account bridge, test real account migration and staff/customer
   permission boundaries. Configure the entire old server's required secrets,
   particularly existing calendar encryption keys, owner/operations/clinician
   emails, Push keys and any service credentials. Do not activate billing.
5. A new origin requires new browser Push subscriptions/PWA installation and an
   explicit Google Calendar OAuth redirect update. Old device subscriptions and
   calendar credentials are not automatically portable just because DB rows copy.
6. Scheduling and background service authentication need separate verification on
   standalone infrastructure. Existing data-write-triggered Push dispatch remains;
   hourly/monthly scheduled jobs are not newly enabled here.
7. Standalone `/mcp` is deliberately unavailable (503) until an independent,
   supported OAuth/service identity boundary is implemented. The old Sites MCP
   remains untouched. Do not assume its platform authentication transfers.
8. Run desktop/mobile browser tests, complete feature smoke tests, real provider
   OTP delivery and a rollback rehearsal. Only then prepare `app.drtamireilam.com`
   TLS/redirects, final consistent export, controlled cutover and DNS changes.

Read `CLOUDFLARE-SETUP.md` for the exact candidate branch/root path and the
read-only R2 inventory comparator. The release CLI now binds verification evidence
to the actual source hash and rejects future-dated evidence. Metadata verification
tooling is prepared, but an actual production export/restore has not been verified.

No public URL is ready from this work. Do not invite users to the standalone app.
