# Approved isolated LAB release — 2026-10-18

User approval received at 21:47 Asia/Jerusalem for the previously described migration and deployment. The permitted target remains isolated LAB only. Main and Production remain excluded. Do not request the same approval again; verify the target and technical release checks before executing.

Source: feature/advanced-theme-customization, implementation commit e834fa470bf4d7dd885c53c73cac0ef0cdbae70f.
Target Worker: doctorcoach-isolated-staging.
Target URL: https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev/
D1: doctorcoach-isolated-staging / 0e7a9467-5758-4d6f-b52a-ee4385a2d37d.
R2: doctorcoach-isolated-staging.
Supabase binding: jbfkzkzcznfacsjdawmf.

## Current blocker

`wrangler whoami` returned "You are not authenticated. Please run wrangler login." No Cloudflare connector is available in plugin search. Owner approval exists; authenticated deployment access does not. No remote SQL, migration, deployment, resource creation or Production mutation has been performed.

## Prepared work and continuation

The feature code, tests and migrations are committed. An isolated LAB build is prepared with `DC_ISOLATED_STAGING_BUILD=true npm run build:standalone`; check the generated `dist/server/wrangler.json` using `standalone/scripts/check-isolated-staging.mjs` before release. Preserve keep_vars and owner-managed settings.

Once an authenticated Cloudflare session is available:

1. Confirm the authenticated account owns this exact LAB Worker and D1/R2, and read the live deployment/bindings and migration history.
2. Verify prerequisites for 0049/0050/0051 against the actual LAB schema. Do not blindly rerun existing migration SQL. Prepare a LAB database recovery point using the platform's supported backup/recovery mechanism before applying pending changes.
3. Apply only pending LAB migrations through the established migration procedure. 0051 only adds nullable custom_json; if 0050 is pending, reconcile its populated-table rebuild separately against the already-tested preservation procedure.
4. Deploy the verified isolated LAB bundle, not the general Sites/Production bundle. Do not change secrets, roles, billing or auth flags as part of this color release.
5. Verify the live identity marker, theme selection, save/refresh/relogin, owner isolation and critical navigation. Report the actual deployed revision and test evidence; never claim the existing URL contains this change merely because the source branch is updated.

Browser/device visual QA remains pending and must be reported honestly. No new feature or Production scope is authorized by this release approval.
