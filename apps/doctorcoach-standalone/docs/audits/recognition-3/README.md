# Exercise Recognition 3.0 — review candidate

Date: 2026-10-26. Relates to Issue #51. PR #53 is stacked on #50; no main merge or Production deployment.

## Delivered

- All **173 existing catalog IDs** have **at least 15 normalized alternative names**, with both Hebrew and English represented for every ID. **23 IDs have 20+**; common examples include dumbbell/barbell bench, pulldown and cable fly.
- **3,041 normalized per-ID aliases**, compared with **531** at #50: **+2,510**. Canonical names/IDs and normalization duplicates are excluded. Counts are per ID, not global unique strings.
- A stricter second metric collapses word-order equivalents and canonical token equivalents: **2,875 token-distinct alternatives**. Both counts appear in `coverage.md`. Literal word-order variants may count separately; runtime permutations are never materialized as extra names.
- Full bilingual lists and counts: `aliases.csv`, `alias-audit.json`, `coverage.md`. Audit has **28 normalized collision keys** and **28 literal diagnostics**, representing deliberate shared names/general-parent overrides rather than 28 silent incorrect assignments. Such aliases count as naming coverage, not a promise of unambiguous automatic selection.
- Existing IDs, meaningful equipment/angle/posture/laterality differences and manual corrections are preserved. Generic movements follow the later owner policy from #49; specific implement names keep specific IDs. The strict matcher still abstains on generic Bench Press/Leg Curl; program import may choose their general parent.
- Deterministic bounded qualifier parser and exact token multiset matching. Conflicting implements/angles/grips/positions/sides block assignment. Unknown/negation tokens are never silently dropped; fuzzy similarity supplies review suggestions only.
- Persisted per-coach corrections can generate HE/EN downloadable `needs_review` proposals. Names/IDs and review diagnostics are projected explicitly; custom IDs, account metadata and prescription fields are excluded. Every proposal remains unapproved; export never writes to the shared dictionary. There is no central moderator approve/apply service.
- `TERMINOLOGY_SOURCES.md` records the final generic squat/pullover terminology evidence. Standalone ambiguous kneeling/כריעה, depth-specific squats and different pullover implements were not added merely to fill counts. A test enforces 15+ normalized bilingual coverage for every current ID.

## Validation

| Check | Verified outcome / boundary |
|---|---|
| Full standalone suite | **1,493 passed**, 0 failed/skipped |
| Root foundation/profile RLS | **10 + 6 passed** |
| Recognition-specific suite | **15 passed**; every curated literal, deliberate nonmatches, variants, qualifiers, collisions and all-ID target |
| Proposals | Seven helper tests, real persisted owner-scope DB test, two HE/EN server-rendered component tests pass |
| XLSX/CSV/text-PDF integration | Synthetic real-file parsing through draft save, assignment, trainee workout and store reload passes with existing regressions |
| Real source workbooks | **106/191 automatic**, vs **95/191** at #50 and **100/191** on initial #53. Five development workbooks, two non-table sheets excluded, all old automatic targets retained. Per-sheet source analysis, not one combined-program assignment. See `source-coverage.json`. |
| Frozen unchanged 32-case benchmark | **15 correct, 0 wrong automatic**, 15/21 = **71.4%** resolvable coverage. Small fixture; not representative real-world precision/recall. |
| TypeScript / changed-file lint | Passed |
| Isolated LAB build / static target check | Passed; no deployment |
| Built local Worker auth/authorization smoke | Passed; synthetic identities and local D1/R2, not real OAuth or remote LAB |
| Independent reviews | Naming ambiguities, incorrect hip/knee wording, count wording and reordered proposal-collision handling corrected and regression-tested; final generic terminology review found no important additional finding |
| Remote CI | Parent 755c7c365671231ffff30686dbc9957c0b1f18a0 PASS — run 40276142045. Final follow-up head needs its own result. |
| Full-app lint | Not rerun. Base #50 documents existing full-app errors; targeted lint does not establish whole-app lint health. |
| Live LAB desktop/mobile | **Not tested for this candidate**. Wrangler remains unauthenticated. No LAB overwrite, remote schema/data writes or real coach/trainee sessions. |

Actual workbook files, sheet names, personal metadata and prescriptions are excluded from Git. Source coverage is a development measurement: those workbooks were used for curation and lack independent labels for every row. Names left unresolved include ambiguous input, headings/instructions, uncertainty and variants absent from the catalog. This work does not claim 100% automatic real-world recognition.

## Reproduce

From `apps/doctorcoach-standalone`:

```sh
node --experimental-strip-types scripts/audit-exercise-aliases.mjs
node --experimental-strip-types scripts/evaluate-exercise-matching.mjs
npm test
npm run typecheck
DC_ISOLATED_STAGING_BUILD=true npm run build:standalone
node standalone/scripts/check-isolated-staging.mjs dist/server/wrangler.json
node --experimental-strip-types standalone/scripts/runtime-smoke.mjs
```

## Remaining release gates

1. Human terminology review through this PR and independently labeled representative XLSX/CSV/text-PDF evaluation; report false positives, recall and coverage without treating development/self-consistency checks as held-out accuracy.
2. Verify final exact-head remote CI.
3. Authorized isolated LAB desktop/mobile acceptance: upload → preview → save → assign → trainee workout → refresh. Coordinate any LAB update so parallel work/user data are preserved. Actual browser/mobile proposal file download also remains unverified.

The numeric naming requirement is complete. Live acceptance and representative accuracy validation remain open; Issue #51 is not closed and PR #53 remains draft.
