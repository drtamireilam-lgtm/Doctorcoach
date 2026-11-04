# Premium Workout 4 / PR #65 — review and correction, 4 November 2026

## Verified repository state

PR #65 was an open draft at `13dff06cbe558a5d9f3e839a5071da30c1e15a0b`, targeting integration `e95108a`. Its existing CI run `41180785987` passed, including both dark/light bilingual Workout 4 browser workflows, regression tests and synthetic Worker tests. The PR description still had historical pending-validation text.

PR #66 is independently open and ready for review at `b4fb4d4`; neither PR nor main was merged or deployed in this continuation.

## Confirmed defect and fix

The new collapsed prescription card read only `targetRpe`, while execution resolves `targetRpes` first. A valid two-set prescription with scalar target 8 and per-set targets `[6,9]` incorrectly displayed RPE 8; a null scalar displayed no target despite both per-set values being assigned.

`components/workout-prescription.tsx` now uses the existing `targetRpeForSet` resolver for every prescribed set. Equal effective targets remain compact; varied targets are displayed in set order, such as `RPE 6 / 9`. Explicit null targets remain `—`, and RIR converts each canonical RPE separately (`RIR 4 / 1`). Labels, palette, layout, calculation formulas, 5% load guard, server authorization and persistence are unchanged.

`tests/workout-prescription.test.mjs` renders the actual TSX with real React, training validation and effort conversion. Only the locale context is supplied as a fixture. Six tests were observed failing before the fix, then passing: contradictory scalar, absent scalar with per-set RIR, and explicit null target, each in Hebrew/English.

Independent review of the original PR confirmed this P2 finding, found no other concrete important regression in the reviewed timer persistence, previous-performance lookup, continuous-load flow and volume/completion summary, then reviewed the fix with no remaining important findings. This is not proof of absence of every possible defect.

## Verification

| Check | Result |
|---|---|
| Unmodified PR #65 baseline | 1,749 tests passed, 0 failed/skipped |
| Corrected PR #65 | 1,755 tests passed, 0 failed/skipped |
| Temporary combined candidate with PR #66 | Conflict-free local merge; 1,761 tests passed, 0 failed/skipped |
| Foundation / local PostgreSQL RLS | 10 + 6 passed |
| TypeScript | Passed |
| Foundation / isolated Worker build | Passed, existing build warnings |
| Static isolated target check | Passed |
| Built Worker synthetic HTTP suite | Passed: auth, permissions, private files, training/import, management and Calendar receipt/retry |
| Changed-file lint | Passed, zero errors/warnings |
| Full lint | Not rerun for this two-file correction; integration's known 78-error debt remains |

The temporary local merge of #66 was explicitly aborted after verification. It was not committed or pushed into #65. The correction preserves the independent PRs and does not depend on applying a migration. The complete runtime source tested locally is uploaded with an identical Git tree; GitHub CI on the new head must be checked separately from the historical run above.

## Release boundaries

No remote database writes, real provider events, secrets changes, deployments or PR merges were performed. Existing LAB Calendar/UID activation, backup/restore and real-account/device gates from PR #66 still apply. No new live acceptance is claimed. Existing CI runs the bilingual dark/light Workout 4 browser workflows on the source branch; local review did not repeat a physical-device or live-provider test.

After exact-head CI and review, #65 can be considered for an explicitly approved integration/LAB release alongside #66. Do not treat this review as merge/deployment authorization. The next UI acceptance remains the complete mobile workout journey and the separately reported crowded Hebrew team/program boards, without replacing Premium UI 3's design system.
