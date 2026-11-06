# Smart workout implementation plan

**Goal:** Extend the existing workout engine and Premium UI without replacing persistence or the RPE heuristic.

**Design:** User selected conservative fatigue handling: prevent increases and explain observed performance decline. Three consecutive completed compatible working sets with strictly declining unrounded RIR-adjusted Epley estimates trigger a ceiling at the latest actual load. Reductions already calculated by the engine remain unchanged. This is an observed performance signal, not a physiological fatigue diagnosis. No exercise-specific coefficients are invented. Existing total-load, repetitions, pain, RPE and section gates remain authoritative.

**Architecture:** Keep the shared server/client `nextSetLoad` calculation and persistence. Add optional fatigue metadata. Expand the existing recommendation component only in the active workout, keeping its compact staff-review default. Show current effort comparison, preview state, a guarded next load, missing-data explanation and manual-choice guidance. Preserve all save/error flows and four-decimal load display.

**Tech stack:** Existing TypeScript, React, node:test, Miniflare and Chromium acceptance scripts. Synthetic data only; no migrations or deployments.

- [x] Add failing engine tests for declining, stable, insufficient, gapped and invalid histories, preview and server persistence/manual override.
- [x] Implement conservative trend ceiling in `lib/set-load.ts`; keep existing two-set results unchanged.
- [x] Add failing bilingual component tests for effort feedback, four-decimal values, missing data and fatigue explanation; expand active workout recommendation and saving feedback with existing theme tokens.
- [x] Run focused tests, full standalone suite, TypeScript, isolated build and two-language synthetic pilot; retain failures.
- [x] Review diff and prepare focused branch for a stacked PR targeting the verified PR #70 branch so its existing fixes are not duplicated. Publication is recorded in GitHub PR metadata. Do not merge or deploy.

**Baseline:** PR #70 remains open draft at 2cd9f21fe43fb9343f2a2c6374520dfdb6da5be4. No subsequent fetched changes; focused baseline 23/23. Prior LAB metadata and unresolved runtime-smoke instability are not claimed fixed by this work.
