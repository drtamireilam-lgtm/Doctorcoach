# Advanced Theme & Color Customization

Date: 2026-10-18. Branch: `feature/advanced-theme-customization`.
Base: isolated LAB full-app commit `6bc5396645cc003e3cfbbfbd03d4bc018e2be3b2` on `test/fullapp-live-staging-20261015`.
App: `apps/doctorcoach-standalone`. No merge or deployment performed.

## Existing architecture retained

The full app already uses next-themes for dark/light, AppearanceProvider, an AppearancePicker in account settings, the authenticated `/api/preferences/appearance` endpoint, and an owner-keyed D1 `appearance_preferences` table with optimistic version checks and account-deletion write barriers. This change extends those components, API and table. It does not add a second provider, separate preferences service or parallel design system. Existing nine palette IDs and saved mode/palette rows are compatible. The isolated anatomy prototype is untouched.

## User-facing behavior

Settings → Appearance → Theme & Colors now provides ten named swatch families (red, orange, yellow, green, teal, blue, purple, pink, gray, black/white), three shades each; native exact Color Picker; editable #RRGGBB text; and Advanced Customization for Background, Primary, Secondary/card, Button, Navigation and Accent colors.

Preset names: DoctorCoach Classic — Red & Black; Professional — Dark Blue; Modern — Purple; Sport — Green; Dark — Black; Light — White. The existing mode shortcut remains. Switching mode regenerates background/card/navigation shades from the chosen primary color, retaining separately selected primary/button/accent values. Selecting the already active mode does nothing. The UI explains that individual surfaces can then be edited again.

- Changes preview immediately across the existing app tokens, with a sample navigation/card/button preview.
- Preview focuses the preview section.
- Apply sends the current draft to the existing authenticated preference API. Saved state changes only after a successful response.
- Cancel discards the draft and restores the saved design without writing to the API.
- Reset to Default previews DoctorCoach Classic; Apply is still required to persist it.
- Leaving the Appearance settings topic discards its uncommitted draft.
- Save errors retain the draft for retry; stale versions/account changes prompt a reload.
- UI labels support Hebrew/English. Swatches and controls have accessible names, pressed state, visible focus and touch-sized targets. Narrow screens use single-column fields.

## Persistence, ownership and concurrency

The server is authoritative on refresh/relogin. Custom preferences are not loaded from global browser storage; this avoids carrying one user's draft into another account. Existing palette key compatibility is retained only after a successful server save. Cross-tab notifications use an owner-scoped version key and reload the server response; drafts are not broadcast.

GET/POST responses include the authenticated owner's ID. New saves send expectedOwnerId, and the store rejects a mismatch with 409 before writing. Payload user IDs or roles are never used to choose the database owner. Existing version-CAS behavior remains. Sequence guards discard stale responses; focus/visibility and owner-scoped storage changes recheck the active account; requests have a bounded timeout. A failed identity load disables Apply until the preference can be reloaded. Unauthorized responses clear the previous account's draft.

Tests verify persistence after store recreation, independent owners, account mismatch, stale concurrent edits, deletion guards, malformed records and invalid color payloads. Real browser logout/login flow still needs manual QA.

## Color model

`Appearance` retains mode/palette and optionally adds six strictly validated six-digit hexadecimal colors. Unknown custom color keys, CSS strings, alpha values and arbitrary properties are rejected. Canonical serialization retains only supported fields and lowercases HEX values.

`lib/advanced-theme.ts` extends the existing CSS variables. It calculates the more legible white/dark text against each independent canvas, card, navigation and button surface; muted/accent text is adjusted to at least 4.5:1 contrast for the tested token pair. Nested component utility aliases are rebound to their local surface. Clinical error/warning/success treatments remain semantic colors, independent of customization. Images/videos are not filtered or recolored. Print resets colored surfaces.

These calculations do not establish whole-app WCAG compliance: legacy hardcoded colors, all chart series, overlays and every interaction state require visual inspection.

## Safe migration (prepared only)

`drizzle/0051_advanced_appearance.sql` contains one additive operation:

    ALTER TABLE appearance_preferences ADD COLUMN custom_json text;

Existing rows, ownership, mode, palette, version, timestamps and deletion guards remain. `db/schema.ts` and the migration journal are updated. This branch inherits the LAB's preceding 0050 palette expansion; release must first reconcile which prior LAB migrations are already applied. Apply migrations only to the verified intended environment after explicit release approval. No remote migration or database modification was performed.

## Verification and limits

The lockfile at the repository root is npm-based, while the full standalone app retains its existing pnpm lockfile and installed dependencies; no package files or dependencies were changed. Commands and final results are recorded in QA_RESULTS.md.

No supported managed browser skill is available, so no browser/device screenshots, actual Color Picker interaction, keyboard/screen-reader audit, cross-tab browser run or end-to-end login test was performed. Responsive CSS and logic are implemented, not device-certified. Before release, check desktop/tablet/phone, Hebrew/English, all presets, arbitrary opposing surface colors, Preview/Cancel/Reset/Apply, refresh/relogin with two test accounts, concurrent edits, offline/save errors, and existing medical/coach/workout screens.

## Release boundary

Only the dedicated feature branch is to be published to GitHub. Main, LAB hosting, Production hosting, users, training records, medical data and remote settings are not modified. No further approval is needed to review this branch. Explicit user approval is required before any later remote migration, merge or deployment; none is requested or attempted by this implementation.
