# Personal appearance — 17 October 2026

Added to the full application on the staging development checkout.

Settings & account → Language & appearance now includes seven action palettes (red, blue, pink, green, purple, orange, teal), independently selectable light/dark backgrounds, an immediate preview, explicit account save, saved-preference reload and reset to red/dark. Controls and status messages support Hebrew and English; color names, text and checkmarks accompany swatches. Mobile controls have 48px targets and wrap at narrow widths.

Device preferences use existing theme storage plus a separate palette key. Authenticated preferences synchronize through `/api/preferences/appearance`; the server derives ownership from the authenticated identity and never trusts a submitted user identifier. Writes use version checks; conflicts require reloading rather than silently overwriting another device. Failed saves do not show success. Account export and deletion include the preference; deletion barriers prevent late writes.

Deployment requires applying the additive `drizzle/0049_appearance_preferences.sql` migration before serving the updated bundle. No remote migration or deployment has been performed. The pending Cloudflare sign-in remains a separate blocker; the existing live Site is unchanged. Changes are local Git commits, not a claim of a live feature.

Validation: 1187 Node tests passed, zero failed/skipped; TypeScript passed. WCAG normal-text contrast >=4.5:1 verified for all seven white-text action buttons and all fourteen accent/card and accent/soft-surface combinations. These numerical checks do not replace an iPhone visual audit. Built Worker HTTP smoke verified authenticated preference saving, no-store responses, wrong-owner input ignored, cross-user isolation, stale-write and cross-origin rejection, persistence, plus the existing first-workout/history and permission checks using synthetic authentication. No real email OTP or phone browser pass claimed.

Dedicated isolated staging production build passed. No Production/Pilot credentials, tables or data were accessed or changed for this feature.

## Live staging checkpoint, 17 October 2026

Owner initialized isolated D1; reported table_count=86 after empty-schema bootstrap, including appearance_preferences. Full application now responds at https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev/. Live anonymous appearance API returned 401. The old Sites application remains unchanged. Added six one-click appearance presets, current selection summary and clearing stale save feedback when another tab changes the palette. All seven colors remain individually selectable with either background (14 combinations). No schema changes are needed for these controls. Authenticated persistence has been verified with synthetic local accounts; actual phone/account preference persistence still needs tester confirmation.

Deployment now preserves dashboard-managed text variables on this isolated Worker (keep_vars=true), including the owner's explicit physician/admin settings. Static release preflight also pins the exact isolated D1 UUID. No extra account roles are granted by this change.
