# Premium colors, simple selection — 2026-10-19

Branch: feature/premium-simple-colors-20261019, based on fix/appearance-toggle-persistence-20261019 (4b0e275). This deliberately preserves the stacked appearance, repeated-exercise and acceptance work. No changes to main or Production.

## Implemented

Exactly 13 presets: Dark, Light, Premium Gold, Premium Silver, Dark Coral, Dark Blue, Purple, Wine Red, Forest Green, Yellow, Amber Orange, Teal Cyan and Rose Pink. Each reuses validated existing appearance fields and derived text/border/hover/focus tokens. Gold/Silver have restrained metallic gradients; other buttons, panels and canvas have subtle depth without animation. Existing medical status colors remain independently styled.

The App appearance picker presents named swatches and immediately previews and saves the exact clicked appearance through the existing owner/version-checked API. No Apply button, component color pickers, sliders, separate display-mode selection or advanced settings. Existing legacy/custom saved preferences remain accepted. Hebrew and English labels are included.

Persistence continues to use the authenticated account's D1 preference record, not a new Supabase table. Server preferences reload on mount and focus, including another device's saved preference. Local storage contains only existing non-sensitive palette/version signals. No remote database changes were made.

## Verification

- Root npm ci, npm test and npm run build passed.
- Standalone npm ci was attempted and rejected because this project uses pnpm-lock.yaml rather than package-lock.json. The existing pinned pnpm installer completed successfully with the frozen lockfile (669 cached packages).
- Standalone npm test: 1,215 passed, zero failed.
- Standalone npm run typecheck and npm run build passed.
- Isolated LAB build: DC_ISOLATED_STAGING_BUILD=true npm run build:standalone passed.
- Generated deployment configuration passed standalone/scripts/check-isolated-staging.mjs.
- Added executable JSX-handler tests for all 13 one-click saves and contrast at gradient stops. Existing database tests verify persistence after store recreation, separate owners and optimistic concurrency.
- Local built-HTTP smoke confirmed all 13 presets persisted through the real owner-scoped preferences route using synthetic identities.

## Release boundary and pending work

The generated LAB target is doctorcoach-isolated-staging, Supabase jbfkzkzcznfacsjdawmf, dedicated D1 0e7a9467-5758-4d6f-b52a-ee4385a2d37d and dedicated R2 doctorcoach-isolated-staging. This verifies source/build configuration only, not live bindings or data separation.

Wrangler whoami returned: You are not authenticated. Please run wrangler login. Therefore no deployment, live migration audit or live LAB acceptance was performed. The existing LAB URL does not yet contain this change: https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev/ .

Before LAB deployment, authenticate the owning Cloudflare account, verify live dedicated bindings and the existing D1 migration ledger (including stacked prerequisites 0051/0052), and follow the established isolated release procedure. No new migration is introduced by this color change.

Real iPhone/Android, Safari/Chrome, RTL/LTR screenshot/layout and real cross-device/relogin tests remain pending. No claim of visual fidelity to earlier image references or full device acceptance is made. Production requires explicit approval after LAB acceptance. This branch is stacked substantially ahead of main; review prerequisites before merging.
