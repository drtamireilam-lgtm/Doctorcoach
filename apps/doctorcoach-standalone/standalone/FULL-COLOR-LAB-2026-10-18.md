# Full color backgrounds integrated into the LAB source

Target branch: test/fullapp-live-staging-20261015, base 8e0c3f7c1acbe83aed5c881156ea1f19cb1efa6c. This is the full standalone app's isolated staging branch, distinct from the root Vite app on feature/lab-team-management. No code from the anatomy branch is included.

The full-color feature has been adapted to the LAB's newer AppearanceProvider rather than replacing it with the older feature-branch component. Existing per-account save/load, optimistic concurrency, local preference, cross-tab sync, language support and deletion barriers are retained.

Nine palette IDs (existing seven plus yellow and neutral), each in light/dark shades, give 18 combinations. Backgrounds, cards, menus and inputs now follow the selected color. Classic black/white options remain through neutral. Clinical warning/error/success treatments remain independently colored. The color preference UI is the existing Settings → Appearance picker; the header still offers the existing light/dark shortcut.

## Schema prerequisite — prepared, not applied remotely

`drizzle/0050_full_color_palettes.sql` expands the SQLite CHECK constraint to accept yellow/neutral. It rebuilds the preference table by copying all existing rows, owner IDs, modes, palettes, versions and timestamps, then restores both deletion guard triggers. A migration regression test verifies preservation of an existing versioned preference. Existing palette values remain compatible. Run this via the established transactional migration procedure after 0049 and before releasing new choices. No remote SQL was executed and no user records were deleted by this task.

## Checks

- Existing Appearance persistence/contrast/deletion tests passed with all 18 combinations.
- Added nine-palette surface/contrast tests and a populated-table migration regression.
- TypeScript passed.
- Full suite and isolated staging build results recorded after execution.
- Browser, screenshots and real-device review remain unavailable in this managed environment.

## Deployment status

NOT DEPLOYED. `wrangler whoami` returned: "You are not authenticated. Please run wrangler login." No Cloudflare connector was available in the plugin search. Sites only exposes the separate hosted Production app and mockups, so it was not used to deploy this Worker. No Production Site deployment, Worker deployment, database migration, secret change or resource creation was attempted.

Intended LAB URL (unchanged): https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev/ . This document does not claim the new colors are live there. A Cloudflare-authenticated session is required to finish the isolated LAB release, verify its existing DB/R2/Supabase bindings and apply the release's pending migrations before deployment. Keep `keep_vars: true` and the LAB-only target configuration.

Verified results: full suite 1,190 passed / 0 failed; TypeScript passed; isolated staging build passed; static generated Wrangler preflight confirmed the dedicated LAB Worker name, D1/R2 identifiers, Supabase LAB URL, disabled legacy bridge and `keep_vars: true`. Remote bindings were not verified because Cloudflare is unauthenticated. Final surface regression also asserts that full-surface CSS is imported after legacy accent-only CSS.
