# Isolated LAB import build handoff — 2026-10-25

The Cloudflare Builds screenshot shows `codex/import-integration-lab-20261025` selected. This documentation-only push requests a fresh build after the branch selection; it does not establish deployment success.

Validated application source: `96ea07033477b268f172bb56a48ec83a103b7108` (1,465 standalone tests and exact-head CI passed). No application code changes accompany this handoff.

Expected Worker: `doctorcoach-isolated-staging` only.
Root directory: `apps/doctorcoach-standalone`.
Build command: `npm run typecheck && DC_ISOLATED_STAGING_BUILD=true npm run build:standalone`.
Deploy command: `node standalone/scripts/check-isolated-staging.mjs dist/server/wrangler.json && npx wrangler deploy --config dist/server/wrangler.json`.

Build and deploy command fields were truncated in the screenshot; their complete saved contents and a successful new Cloudflare build must still be verified. Preserve existing runtime secrets and role settings. No migrations, database deletion, production deployment or main merge is authorized.
