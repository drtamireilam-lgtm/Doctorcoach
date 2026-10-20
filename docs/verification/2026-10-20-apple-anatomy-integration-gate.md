# Apple Premium + Anatomy integration gate — 2026-10-20

Status: INTEGRATION NOT COMPLETE. This branch starts from Apple Premium PR #24 at `19818e8c765d699474489eee20abc52f25bce776`. No anatomy merge, deployment, migration or Production changes have occurred.

## Verified GitHub ancestry
- Apple Premium is 14 commits ahead of main and 0 behind.
- Apple Premium is 3 commits ahead of `feature/ui-ux-liad-followup-20261019`, 0 behind; Liad changes are included.
- Anatomy `feature/anatomy-completion-20261019` and Apple Premium diverge: comparing anatomy -> Apple Premium gives 14 ahead, 1 behind. Anatomy-specific work is **not** included in Apple Premium.
- Do not treat the anatomy PR as merged merely because Apple Premium has theme/layout changes.

## Anatomy integration files (from comparison)
New anatomy files requiring integration:
- `components/anatomy-body-map.tsx`
- `components/anatomy-learning-motion.tsx`
- `components/anatomy-reference.tsx`
- `components/exercise-anatomy-links.tsx`
- `lib/anatomy-learning.ts`
- `lib/anatomy-reference.ts`
- `lib/prepared/anatomy-learning.json`
- `tests/anatomy-learning.test.mjs`
- `tests/anatomy-render.test.mjs`
- `docs/anatomy/INTEGRATED_ATLAS_2026-10-19.md`

Overlapping integration hotspots to review manually:
- `app/page.tsx`, `app/care.css`, `components/anatomy-workspace.tsx`, `components/anatomy-illustration.tsx`, `components/community-workspace.tsx`
- `lib/anatomy.ts`, `lib/community-store.ts`, `lib/feedback-topics.ts`, `lib/locales/he.json`, `lib/locales/en.json`
- `.github/workflows/ci.yml`, `MASTER_PLAN.md`

## Safe integration procedure
1. Work ONLY on `feature/lab-apple-anatomy-integration-20261020`; never merge to main or deploy Production.
2. Fetch both branches locally in a capable work environment, run `git merge --no-commit --no-ff feature/anatomy-completion-20261019`, inspect every conflict; preserve Apple Premium shell and Liad trainee navigation while integrating atlas, exercise links, content and feedback. Do not use wholesale `--ours`/`--theirs` on overlapping files.
3. Resolve conflicts, review `git diff --check`, run root tests/build and standalone tests/typecheck/isolated build. Compare lint diagnostics with the known baseline (62 errors, 95 warnings as of PR #24); do not weaken lint settings.
4. Validate atlas content, bilingual locale, 129 records, 42 bilingual articles, 122 exercise links, feedback ownership, auth/RLS and 13 theme persistence in synthetic HTTP tests. The 87 partially documented anatomy records remain a known gap.
5. Validate generated isolated target using `standalone/scripts/check-isolated-staging.mjs`; verify actual remote D1/R2 ownership, migrations, secrets and LAB-only routing before any deployment.
6. Perform authenticated browser/mobile RTL and LTR visual acceptance, including theme refresh/re-login, anatomy navigation, workout, My File and permission boundaries.
7. Only after successful gates prepare an immutable release candidate and rollback procedure. Keep main/Production unchanged.

## Current release blockers
- No merge of anatomy into this branch yet; no new combined tests run.
- Apple Premium PR #24 lint remains failing on pre-existing diagnostics, and actual iPhone/browser acceptance is absent.
- The CI packaging steps are conditional on `feature/ui-ux-liad-followup-20261019`; they were skipped in PR #24's passing run, so a PR #24 candidate artifact was not produced.
- Live Cloudflare LAB ownership/bindings and migration ledger are not verified; Wrangler authentication is unavailable in the prior execution.

This document is a tracked integration checkpoint, **not** a claim of completed integration or successful release.
