# DoctorCoach stabilization — 19 October 2026

## Source and compatibility

Development branch: `stabilize/themes-and-qa-20261019`, based on `feature/advanced-theme-customization` at `a95d32f997a70fa8dd03c8ed69632c475f419cfe`.

PR #11 adds browser-local accents to the older root Vite application. It is not the current standalone application's theme system. The latest advanced-theme branch already contains the full-app staging work from PR #10 and account-owned appearance persistence. This change extends that implementation, preserving existing features and storage IDs. It does not merge divergent application architectures or backport the old picker over the newer one.

Inspected all 22 remote branch heads and PR inventory, including #7–12. `main` remains at `8b9c2f2dd77e7cb3d56acc4195049bb6d9e7b473`. No main merge or Production deployment.

## Changes

- Added ready-made Dark, Light, Blue, Purple, Wine Red, Yellow and Forest Green choices, preserving DoctorCoach Classic as an eighth choice. Existing IDs for classic/dark/light/professional/modern/sport remain stable.
- Added Hebrew labels and visual background/card/button swatches to the existing preset buttons. Presets continue through reversible preview, Apply/Cancel and owner-scoped server storage.
- Wine Red uses validated custom colors with the existing red palette ID; no new migration or changed palette constraint is required.
- Added persisted-preset and contrast checks for all presets: body/card/navigation/button text is at least 4.5:1 against its corresponding surface.
- Updated the built Worker smoke assertions for the ownerId response added by the prior implementation. They now verify the actual identity mapping and reject a forged expectedOwnerId, rather than dropping the new field from assertions.
- Extended CI with Node 24, pinned pnpm 11.25.0/frozen lockfile, full-app tests, typecheck, standalone build and synthetic Worker HTTP smoke. Added push verification for stabilize/**. No deploy step.

## Checks executed locally

- Root: `npm ci`, `npm test` (10 foundation checks + 6 profile/RLS tests), `npm run build`: PASS.
- Standalone: `pnpm install --frozen-lockfile` using its existing pnpm lockfile: PASS. No npm lockfile was invented for this app.
- Standalone: `npm test`: 1,199 passed, 0 failed, 0 skipped.
- Standalone: `npm run typecheck`: PASS.
- Standalone: `npm run build:standalone`: PASS.
- Built local workerd HTTP smoke: PASS. Synthetic OTP/registration/refresh, spoofed identity rejection, coach/trainee/doctor/admin roles, independent coach rosters, cross-user reads/writes/progress denial, medical redaction, private PDF/video bytes, revocation, registration/link rollback and retry, first workout, RIR, next-set adjustment, history, appearance ownership/persistence and logout replay.
- `feature/lab-team-management` at 90283fb in a separate worktree: `npm ci`, `npm test`, `npm run build`: PASS.
- `feature/interactive-3d-anatomy` at 1dcb0a5 in a separate worktree: `npm ci`, `npm test`, `npm run build`, `npm run anatomy:build`: PASS. Initial command `build:anatomy` failed because the script is named `anatomy:build`; corrected command passed.
- Exercise inventory: 157 entries, no missing English names and no duplicate IDs. This checks presence, not translation accuracy or completeness of all gym exercises. Existing search, assignment, set-load, RPE/RIR and workout suites were retained; algorithms were not rebuilt.
- `git diff --check`: PASS.

## CI findings

Latest LAB run 39106598226 at 90283fb: success. Two previous failures (39104147204, 39104075098) were TS2657 in src/AccountWorkspace.tsx at 182:346, already corrected upstream. PR #12 run 39036259593 failed because its foundation test tried src/platform/domain.ts (ENOENT); its latest run 39036329727 succeeded. PR #11 latest run 39034282154 succeeded. Those runs test the root app only; they are not evidence for the nested standalone app. New CI job has local command verification; remote result must be checked after push.

## Anatomy status and limits

No anatomy code was integrated or overwritten. The separate branch contains 15 bilateral schematic muscle proxies, OrbitControls rotation/pinch/zoom bounds, deep-link/list selection, layer controls, demand rendering and DPR cap 1.5. Records have Hebrew/English names and draft descriptions, but full bilingual anatomical detail and professional validation remain incomplete. It is not a finished anatomical atlas. Browser/touch/GPU behavior remains unverified.

Playwright was available but Chromium was absent. Browser launch failed; download attempts returned truncated/non-ZIP content. No screenshot, browser visual pass or real-phone performance result is claimed. Theme token contrast tests do not prove contrast for every rendered screen or every hardcoded color.

## LAB / Cloudflare

Read-only `wrangler whoami`: unauthenticated. No remote D1/R2 access, migrations, secret changes, resource creation, email sending or real-user data changes were performed.

Source config targets only doctorcoach-isolated-staging, D1 0e7a9467-5758-4d6f-b52a-ee4385a2d37d, private R2 doctorcoach-isolated-staging, Supabase identity project jbfkzkzcznfacsjdawmf, workers.dev origin https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev, disabled legacy bridge, manual billing and keep_vars true. These are source settings, not verified remote bindings or proof of a live deployment. The older standalone/wrangler.json contains a placeholder D1 and must not be used as the isolated release target.

Production remains untouched. Authentication with actual email/OTP, current deployed Production bindings and remote separation cannot be certified from this session.

## Next actions

1. Review the development diff and remote CI result. Do not merge main without approval.
2. In a Cloudflare-authenticated session, verify isolated Worker/D1/R2 bindings and migration history. Follow the existing isolated-staging runbook; preserve data and use the dedicated config. Apply only pending migrations after review. No Production deployment is authorized.
3. Test Apply, reload, sign-out/sign-in, second-account isolation, all presets and mobile screens in the isolated LAB with synthetic identities. Verify real OTP delivery. No browser pass is currently established.
4. Keep 3D anatomy separate pending anatomical review, complete bilingual content and real-device testing.
