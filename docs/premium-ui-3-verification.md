# Premium UI 3 — implementation and verification

Base: PR #62, `5d5284f55677017459e63252f24199aa4bd486f8`.
Branch: `feature/doctorcoach-premium-ui-3`.

This draft is a coherent implementation of the design foundation, home dashboard and rest timer. **It does not complete the ten-screen redesign or establish 90–95% visual fidelity.** The remaining screens retain their real components and receive the shared presentation layer.

## Implemented

- Navy/cyan/gold default through the existing account-owned appearance system; all 18 saved presets remain available and unchanged.
- Scoped shared surfaces, buttons, typography, responsive spacing, safe-area navigation, focus feedback and reduced-motion support.
- Home hero with a decorative generated training photo, authenticated personal greeting, existing guarded StartButton, real workout count, authorized step data and dated self-reported energy. No estimated clinical recovery score.
- Reusable PremiumCard and ProgressRing; unknown values remain unknown, and zero remains zero. Rings without an actual goal are unfilled.
- Five mobile destinations: home, workouts, progress, anatomy, More. Personal files remain in More; existing staff filtering and navigation leave guards remain intact.
- Local wall-clock rest timer: start, pause, reset and configurable duration. It never changes a prescription or writes to workout storage.
- CI coverage for the feature branch and integration PR base, with local synthetic screenshot checks and evidence upload. No deployment step was added.

## Screen status

| Screen | Status | Remaining work |
| --- | --- | --- |
| Home | Implemented | Further reference matching; original onboarding/next-step guidance remains below the dashboard |
| Workout logging | Partial | Full reference set-table/media layout; test browser save/edit with a local persistent fixture |
| Anatomy and recovery | Partial | Reference front/back composition, legend and selected-muscle cards |
| Progress analytics | Partial | Weekly/monthly filters, volume bars and reference record rows |
| Cardio 2.0 | Partial | Reference activity-player layout using supported sources; no fabricated map/device sync |
| Exercise library | Partial | Media-rich layout using verified exercise assets |
| Exercise details | Partial | Reference media hero/tabs where verified content exists |
| Pain and rehabilitation | Partial | Reference body-region layout; retain clinical/coaching permission boundaries |
| Medical consultations | Partial | Reference appointment/provider layout; keep approval and Calendar readback semantics |
| User/trainer profile | Partial | Reference profile tabs, coach summary and authorized statistics |

## Verification

Commands run from `apps/doctorcoach-standalone` unless stated otherwise:

- `npm test`: initial full run, **1,708 passed / 17 failed / 1,725 total**. Four failures were superseded UI expectations; the updated tests pass in the focused run. Thirteen date-sensitive coach removal/archive tests failed during the final 48 hours of the month.
- Those 13 failures reproduced on an untouched archive of base `5d5284f`: **33 passed / 13 failed / 46 total** in the five affected test files. Backend behavior was not changed to make them pass.
- `node --experimental-strip-types --test tests/home-summary.test.mjs tests/premium-default-theme.test.mjs tests/mobile-navigation.test.mjs tests/rest-timer.test.mjs tests/trainee-ux-refactor.test.mjs tests/advanced-themes.test.mjs tests/theme-toggle-persistence.test.mjs`: **36 passed**. Includes stale/incomplete/blocked onboarding, zero/missing metrics, theme persistence and role-aware navigation.
- `npm run typecheck`; `npm run build:standalone`: passed on the implemented UI. The wrapper timed out during concurrent verification; a later run completed, and the final source is also checked with the same `vinext build` command and standalone environment without the wrapper timeout.
- `node --experimental-strip-types standalone/scripts/runtime-smoke.mjs`: passed on retry using disposable local D1/R2 and synthetic identity/Google providers. Covers import/save/assignment, workout/RIR/history, medical isolation, user roles/coach revocation, consultation transitions and verified Calendar retry/readback/cancel. An earlier concurrent run returned 503 instead of 403 at a revocation assertion; its underlying cause has not been established.
- Repository root `npm test` and `npm run build`: passed (10 foundation + 6 local RLS tests). No external database was contacted.
- `npm run lint -- --format json --output-file .sites-runtime/ui3-full-lint.json`: **78 errors / 116 warnings** across 812 files; known failures remain. A source-only comparison across versioned/new files reports **78 errors / 117 warnings**, versus **78 / 117** on the baseline. No new errors. One new `no-img-element` warning for the decorative hero replaces an older removed warning. Generated browser/Worker caches are excluded; application lint rules are unchanged.
- `node --experimental-strip-types scripts/premium-ui-3-browser-smoke.mjs`: actual page/components with synthetic local API responses; all external requests and fixture API writes blocked. Four widths (390/430/768/1440), Hebrew route screenshots, English home/workout/library/details, timer controls, horizontal-overflow checks and actual gold CTA color. Also checks blocked training and missing metrics. No device or real-account synchronization was tested.

Visual comparison confirmed the home palette, image/CTA composition, circular metrics and mobile navigation approach. Existing exercise details, analytics and anatomy layouts still differ materially from the reference. No numerical fidelity score is claimed. Screenshots use synthetic data and are not evidence of real-device health integration or real Google sign-in.

## Important files

`app/premium-ui-3.css`, `app/layout.tsx`, `app/page.tsx`, `components/premium-home.tsx`, `components/premium-ui.tsx`, `components/rest-timer.tsx`, `components/site-areas.tsx`, `components/training-workspace.tsx`, `lib/home-summary.ts`, `lib/rest-timer.ts`, `lib/mobile-navigation.ts`, `lib/appearance.ts`, `lib/advanced-theme.ts`, the focused regression tests, `scripts/premium-ui-3-browser-smoke.mjs`, `.github/workflows/ci.yml`, `eslint.config.mjs` (generated browser-cache exclusion only).

## Safety and next steps

No remote database, migration, production credential, main branch, LAB Worker or production deployment was changed. Authentication, permission logic, Calendar synchronization, exercise matching and workout storage were reused.

Keep this PR in Draft. Complete the remaining screen-specific layouts, stabilize the existing date-sensitive tests without weakening billing rules, and perform manual keyboard/screen-reader, real-device and authorized end-to-end verification. A separate explicit approval is required before any LAB deployment or merge. Existing authorization is sufficient to continue the frontend implementation.
