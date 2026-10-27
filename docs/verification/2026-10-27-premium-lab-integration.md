# Premium Home + configured import LAB branch

Integrated the content of origin/codex/import-integration-lab-20261025 (7464660) into the existing Premium Home candidate. Shared page/layout/site-area conflicts preserve the incoming navigation, account shortcut, import/auth/learning/anatomy code, with PremiumHome and real weekly-workout props added. The incoming deterministic billing fixture supersedes the earlier date-only fixture fix. No new schema changes beyond those already present in that LAB branch; no migrations or remote writes executed.

Home now consumes the existing appearance tokens for canvas, cards, headings, text, accents and primary buttons. This covers all nine current presets, including the original seven plus yellow/neutral, in both modes, and reuses custom appearance tokens. No second preference store was added. Narrow mobile summary cards use rows to avoid broken words.

## Local verification
- TypeScript passed.
- All 1465 tests passed. The old returning-home layout assertion was updated to test named consultation visibility and navigation in both languages and both returning/public variants.
- DC_ISOLATED_STAGING_BUILD=true npm run build:standalone passed; check-isolated-staging.mjs accepted the generated doctorcoach-isolated-staging configuration.
- scripts/premium-home-smoke.mjs exercises all nine palettes x two modes x 320/390/1440 widths using the same themeTokens function as the appearance provider, verifies token adoption and no horizontal overflow, and checks English direction/consult navigation and page errors. Screenshots for teal light/dark inspected locally.

## Remaining acceptance
No deployment performed from this environment (Wrangler unauthenticated). User is configuring the existing LAB Worker Builds UI. Keep LAB root apps/doctorcoach-standalone and the isolated build/check/deploy commands. Only select the Premium Home branch after this candidate is saved and its CI checked. No merge to main; no Production app/secrets changes. Cloudflare calls its active environment Production even for this isolated LAB Worker.

Authenticated user journeys, appearance persistence against live LAB, notifications, import acceptance on the remote deployment and physical-device checks remain pending. Browser palette checks inject the production theme token output; they do not claim server preference persistence.
