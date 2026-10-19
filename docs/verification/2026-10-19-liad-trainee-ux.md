# Liad trainee UI/UX refactor — 19 October 2026

## Scope and source

Implements the user's approved UI requirements from software engineer Liad Aram. Working branch `stabilize/trainee-ux-liad-20261019`, based on latest pilot branch commit `0c315ce92d077b95a34eb7a3b74e1b1372fa06fd` (PR #22). This preserves PR #21 Premium UI and all pilot/auth/network fixes. The preferred `feature/lab-team-management` remains a divergent root Supabase application, not the full D1/R2 app, and was not overwritten or merged. Read project master plan and inspected current navigation, home, account/file, themes, roles and CI configuration. No AGENTS.md was found in the checkout.

## Implemented behavior

- Authenticated trainee Home reuses the existing real-data next-workout/start/resume flow, adds a greeting from the saved intake name, and retains real progress/message summaries. Incomplete onboarding, no program, medical hold and failed/loading data have explicit states. No demo values were introduced.
- Removed the duplicate Home navigation gallery for authenticated and public Home. Public hero, registration/introduction, team qualifications, how-it-works and approved stories remain. Staff dashboards remain permission gated.
- Shared desktop and phone main destinations: Home, My program, My file, More. Existing deep links remain routable. History/nutrition/recovery highlight My file; settings/privacy/membership highlight More.
- More is a compact five-row list: Exercise library, Anatomy & learning, Contact, Settings, Help & support. Help opens the existing feedback/help form. No new support screen or backend was created. Removed redundant progress, team/stories and sign-out entries from More. Public team/stories remain accessible through the introduction and existing links; staff tools remain role gated.
- Personal file uses the same compact rows and exposes profile/questionnaires, injuries, documents, team, instructions, progress, rehabilitation/pain, nutrition/measurements, check-ins, videos and appointments. Existing archive/restore/deletion-request document controls moved here from Settings. Progress has a return-to-file link; other existing progress subnavigation remains.
- Settings no longer lists personal profile or documents. It retains membership, privacy/consents, notifications, language/appearance, help/install and authorized administration, adds account-security guidance using the existing sign-in route, and owns the sign-out action. No password/authentication backend or professional permissions changed.
- Removed duplicate signed-in header appearance/language, personal-file avatar, install action and sidebar settings/sign-out shortcuts. Public language switching remains available; signed-in appearance and language controls remain in Settings.
- New shared CSS uses existing card/text/line/muted/focus/hover tokens, logical alignment and common responsive rules, not theme-specific implementations. Phone rows/controls have minimum touch heights; layout reserves bottom/safe-area space. WhatsApp is compact on phone and hidden during an active workout view so it cannot cover set controls.
- Updated onboarding/tour explanations and explicit HE/EN translations for the changed copy. Saved personal names are isolated from automatic translation. Theme persistence implementation and all thirteen existing presets are unchanged.

## Verification and review

New behavior tests were observed failing before implementation, then passing. Additional static code review found that file destinations were initially added to an unused list rather than the rendered hub. This was corrected; a regression test now renders the actual file hub and asserts its destinations. No further high-confidence critical issue was identified by that review. An obsolete navigation uniqueness assertion initially failed after adding History to My file; duplicate secondary history entry was removed and the suite rerun.

Final results: root npm ci completed; root foundation/RLS tests: 16 passed; root npm run build passed. Standalone full suite: 1,233 passed, 0 failed, 0 skipped. Standalone TypeScript and isolated build passed. Generated-target preflight and built synthetic Worker HTTP smoke passed, including all thirteen theme preference roundtrips, OTP/refresh/logout, role isolation, workout/set/history and private files. Existing bundle-size/route-classification build advisories remain. Standalone dependency inputs and lockfiles were unchanged; its already-installed frozen dependencies were reused. Physical/mobile/browser E2E acceptance was not completed (see limitations below).

## Files changed

All implementation changes are under `apps/doctorcoach-standalone`:

- `app/page.tsx`, `app/layout.tsx`, new `app/trainee-ux.css`.
- `components/site-areas.tsx`, `components/account-settings-hub.tsx`, `components/care-workspace.tsx`, `components/trainee-start.tsx`, `components/onboarding-workspace.tsx`.
- `lib/mobile-navigation.ts`, `lib/navigation-tour.ts`, `lib/localization.ts`, `lib/prepared/welcome-cards.json`.
- New `tests/trainee-ux-refactor.test.mjs`; updated `tests/mobile-navigation.test.mjs`, `tests/trainee-home-ui.test.mjs`, `tests/localization.test.mjs`.
- This verification report.

No database/schema/migration, API authorization, workout formulas, billing/payment backend, theme persistence, user record or saved-history implementation was changed. Existing server guards still determine medical, training, nutrition and administrator access.

## Deployment and visual limits

Fresh Wrangler whoami still reports unauthenticated. No remote migration or deployment was attempted. No main merge, Production change, user deletion or real-data test occurred. The generated isolated LAB target can be checked locally, but current remote resource bindings and deployed commit remain unverified.

Local E2E/real screenshot validation was attempted: image-provided Playwright exists but its Chromium binary is absent; download from the official Playwright CDN failed with a truncated/non-ZIP response. A separate local built preview runner started successfully on loopback, but Cloud Browser opening localhost:8788 returned ERR_CONNECTION_REFUSED because it cannot reach that execution host. No fabricated screenshot, mockup or old live screenshot is presented as this version. No physical iPhone/Android, mobile browser visual/layout or authenticated live-LAB journey is claimed.

Remaining release step: authenticated inspection of the dedicated Cloudflare LAB, safe LAB-only deployment and real HE/EN mobile acceptance at narrow iPhone/Android widths (including keyboard, theme persistence, start/set-entry/finish and WhatsApp placement). The code is reviewable independently of that access blocker.
