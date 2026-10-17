# Isolated Staging preparation — 17 October 2026

Source: `test/fullapp-live-staging-20261015`, PR #10, base a80c987.
Full application root: `apps/doctorcoach-standalone`; repository root is a different Vite application.

## Proposed external configuration — requires owner approval

- Dedicated Worker: `doctorcoach-isolated-staging`.
- Proposed HTTPS custom domain: `staging.drtamireilam.com`. Availability, ownership and existing DNS use have NOT been verified. Never overwrite an existing route.
- Dedicated new EMPTY D1 `doctorcoach-isolated-staging` and R2 bucket with the same name. Do not reuse any existing binding or import an export.
- Supabase identity ONLY: `jbfkzkzcznfacsjdawmf`, verified ACTIVE_HEALTHY. Public schema has no tables. Three auth identities exist; their contents were not accessed.
- Fresh server-only 32-byte session encryption secret. Use staging publishable API key only. No service-role keys, pilot secrets, production keys or bridge keys.
- Legacy bridge disabled; isolated issuer. Registration enabled, initial trainee role. No staff allowlists copied. Any synthetic staff role must be explicitly provisioned after approval.
- Billing manual, no payment credentials, no push/calendar credentials. No automatic deploy triggers.
- Test data only. Do not enter patient records, real medical histories, identifiable trainee files or real videos. An empty dedicated store prevents historical leakage; it cannot prevent a tester from typing real data.
- workers.dev and preview URLs remain disabled until routing is approved. No public URL currently exists from this work.
- Cloudflare account, quota, existing staging routes, resource identifiers and actual usage pricing remain unverified. No claim of a free deployment.

## Implemented locally

Separate Wrangler candidate `standalone/wrangler.isolated-staging.json`; existing config preserved. Dedicated build:

```
DC_ISOLATED_STAGING_BUILD=true npm run build:standalone
```

Runtime staging policy fails closed on another Supabase project, another origin, legacy linking or enabled live integrations. Identity requests are restricted to the six staging authentication/session endpoints with redirects disabled. This is an identity transport boundary, not a general network firewall.

D1 UUID deliberately remains a placeholder until a NEW resource is approved and created. Do not deploy this placeholder. Apply all ordered `drizzle/*.sql` schema migrations plus `standalone/migrations/0001_identity.sql` to the new empty D1. Never run them against another database. Inspect generated `dist/server/wrangler.json` resource bindings, assets and environment before release. Configure publishable key and fresh session key through secure provider secret tooling; never commit secrets.

Cloudflare CLI reported unauthenticated in this environment. No Cloudflare plugin was found by provider search. Therefore resources, DNS and remote secret installation are not prepared or verified yet. GitHub permission does not authorize Cloudflare CLI. A connected authorized Cloudflare session is required before final resource and cost review.

## Verification

- Baseline full app suite: 1182 passed, zero failed/skipped.
- Two new staging security regressions passed (wrong project/origin, legacy credentials and live integrations denied; identity egress denied before network).
- Supabase security advisor: leaked-password protection disabled warning. This application uses email OTP; no setting changed.
- Real OTP/full-app/iPhone end-to-end remains pending external deployment and controlled tester interaction.

## Tester flow after deployment

1. Open the approved HTTPS URL in Safari; use a controlled test email and a fresh OTP.
2. Explicitly create a new staging account; do not import/link a legacy account.
3. Fill the intake and consent screens with synthetic information.
4. An authorized staging operator grants a time-limited synthetic self-training entitlement via the existing access management flow. Do not expose the local `/__staging/grant` helper on the internet.
5. Build a test plan with two sets; start workout one, enter reps, weight and actual RPE, mark each set done.
6. Finish, verify the success acknowledgement, history and progress. Reload and sign in again to verify persistence.
7. Verify a second unrelated trainee cannot read the first account's data; verify trainee cannot reach staff/medical access. Test revoked access and logout.

Do not merge main, edit the existing Site, deploy production, copy patient/trainee data, or relax the existing production release gate.

## Final local results

- Full suite after changes: **1184 passed, 0 failed, 0 skipped**.
- TypeScript after changes: passed.
- Dedicated isolated staging production build: passed.
- Built Worker smoke: passed synthetic registration, OTP rejection, token refresh, identity spoofing rejection, first workout, RIR, next-set load, history, private PDF/video isolation and logout replay; D1 registration/link failure rollback passed.
- Local HTTP smoke: **9 passed, 0 failed**, no OTP sent or remote database writes.
- Deployment preflight intentionally BLOCKED because dedicated remote D1 is not created/verified. This is expected, not a successful remote release check.
- No Cloudflare deployment, remote D1/R2 creation, DNS changes, remote secrets, merge, main change or existing Site change performed. Changes retained as a local Git commit; not pushed because connected provider automatic deployment triggers have not been verified.

## Owner-created D1 checkpoint

Owner screenshot on 17 October 2026 shows `doctorcoach-isolated-staging`, UUID `0e7a9467-5758-4d6f-b52a-ee4385a2d37d`, zero tables and zero read/write queries. Source staging configuration now references that UUID. This is screenshot evidence; API ownership/bindings are not independently verified. The existing `doctorcoach-test-20261015` instead shows 85 tables and activity and must not be reused. Dedicated R2 and Worker setup remain pending. No remote migrations or deployment performed.

## Owner-created R2 checkpoint

Owner screenshot at 13:59 on 17 October 2026 shows `doctorcoach-isolated-staging`, Standard storage, Public Access Disabled, bucket size 0 B and zero Class A/B operations. Resource is separate from existing test bucket; do not copy its contents. Worker bindings, schema initialization, secret installation and deployment remain pending.

## HTTPS fallback checkpoint
Owner dashboard reports no matching Cloudflare zone for staging.drtamireilam.com. Do not onboard the existing domain or change its nameservers. Use only https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev for this isolated target; runtime origin and static preflight are pinned to that exact HTTPS origin. Preview URLs stay disabled. Cloudflare TypeScript and full-app build passed in the owner-provided log; deploy command remains exit 1. Owner confirmed saving both required secrets. D1/R2 bindings match the isolated resources in screenshots; schema initialization and live tests remain pending.
