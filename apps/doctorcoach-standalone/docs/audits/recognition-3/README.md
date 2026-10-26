# Exercise Recognition 3.0 — implementation and remaining gates

Date: 2026-10-26. Relates to Issue #51; intentionally does not close it.
Base: PR #50, `codex/import-integration-lab-20261025`, commit `7464660da7b3d1f752824252b03f45c57bc19607`.

## Implemented

- Inspect latest PRs first: #44 → #45 → #48 → #49 → #50 is the existing linear import stack. #52 cardio is independent and was not merged into this work.
- Add literal Hebrew/English names, transliterations, gym terminology, conventional abbreviations and plausible spelling forms for all 173 existing catalog IDs. No new exercise IDs, schema changes or catalog variant migrations.
- **2,455 additional normalized per-exercise aliases**, from **531 to 2,986**. Canonical Hebrew/English names and IDs are excluded, and DB/dumbbell and punctuation normalization duplicates do not count twice. These are per-ID counts, not global unique strings.
- **160/173 IDs have 15+ aliases**, and **23 have 20+**. The remaining **13 generic parent movements have 8–13**. Their exact deficits are in `alias-audit.json` and `coverage.md`. No meaningless suffixes or fabricated aliases were kept to conceal these shortfalls. Therefore the request for 15 per EVERY exercise is **not complete**.
- The second, stricter metric collapses token order and excludes canonical token equivalents: **2,820 token-distinct aliases**. Literal word-order variants may count in normalized literal totals; runtime permutations are never materialized as extra dictionary entries. Both counts are displayed side-by-side.
- Deterministic qualifier extraction exposes implement, bench angle, grip, laterality, side, position and movement. Contradictory equipment/angle/grip/posture/laterality blocks assignment. It is a bounded vocabulary, not a comprehensive natural-language parser.
- Exact token multisets allow reordered verified names, including mixed-language names. No tokens, negations, unknown equipment or side modifiers are silently removed. Shared names still require selection unless the existing opted-in general-parent import policy applies. Fuzzy spelling remains suggestions only; no arbitrary confidence threshold was introduced.
- Preserve #49's owner policy: unspecified movements import as general parents; explicit equipment and angles retain their specific IDs. Strict matching still abstains on Bench Press / Leg Curl. The older issue's blanket ambiguity wording does not override the later explicit general-parent policy.
- Existing manual corrections/save/assignment and shared-dictionary immutability are preserved. The importer now exports review-only alias proposals from these persisted personal corrections. Names/IDs are projected explicitly, custom IDs and already-known aliases are omitted, and conflicting qualifiers/targets/token-equivalent proposals are flagged. Export never changes the shared dictionary; there is no central moderator approval/apply service.

## Validation

| Check | Actual outcome / limit |
|---|---|
| Complete standalone `npm test` | 1,491 passed, 0 failed, 0 skipped |
| Root foundation/profile RLS `npm test` | 10 + 6 passed |
| Recognition-specific tests | 13 passed, including every configured literal, deliberate nonmatches, custom collisions, token counts and qualifiers |
| XLSX/CSV/text-PDF | New synthetic real-file journeys through preview parser, draft, assignment, workout and store reload passed alongside existing fixtures |
| TypeScript | Passed |
| Isolated standalone LAB build | Passed; no deployment |
| Static LAB target validation | Passed |
| Built local Worker authentication/authorization smoke | Passed; synthetic identity provider, local D1/R2; not real OAuth or remote LAB |
| Changed-file ESLint | Passed |
| Full-app lint | Not rerun; base PR documents 78 existing errors and 104 warnings. Changed-file lint is not a clean full-app lint claim. |
| Frozen 32-case benchmark | 15 correct automatic assignments, 0 wrong; 100% observed precision among accepted cases, 15/21 = 71.4% resolvable coverage. Base documented 13/21 = 61.9%. Small fixture, NOT a representative real-world accuracy estimate. Corpus unchanged; no holdout-specific tuning. |
| Independent review | Found ambiguous pulley names, incorrect hip-vs-knee flexion terminology, ambiguous hip raise and misleading word-order count wording; corrected and regression-tested |
| Remote CI | Parent 83e3ba85e3cb21acd34f2cf4c164974a98101d3d PASS — run 40273725499. Follow-up head pending. |
| Live LAB / desktop/mobile | NOT TESTED for this candidate. Current LAB is the #50 baseline; no authorized isolated coach/trainee test sessions were established here and this new candidate was not deployed. |

## Reproduce and review

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

`aliases.csv` contains complete names per catalog ID for terminology review. JSON includes 27 normalized collision keys and 27 literal diagnostics: collisions/general-parent overrides are deliberate evidence for review, not 27 silently wrong automatic assignments. Token-signature collisions are reported separately. No source workbooks, patient details or private metadata are included.

## Remaining before Issue #51 can be completed

1. Review the curated terminology with a coach and obtain additional meaningful real-world names for the 13 generic movements; reject misleading aliases rather than meeting a quota cosmetically.
2. Calibrate on independently labeled, representative real Excel/CSV/text-PDF imports, measuring per-variant false positives, precision, recall and coverage. The 32-case fixture and self-consistency checks cannot substitute for this.
3. Review exported proposals before any shared-dictionary edit. A central moderator UI/approval service is not included; proposals remain manual code-review inputs.
4. Verify the candidate in an authorized isolated LAB environment with synthetic test identities: upload → preview → save → assign → trainee workout → refresh, desktop and mobile. Coordinate any LAB update to avoid overwriting parallel work.
5. Confirm exact-head remote CI and keep this PR as draft until the remaining gates are resolved.

See `FOLLOWUP_2026-10-26.md` for actual source-workbook coverage (106/191 vs 95/191), proposal export tests and limits. No merge to main, Production deployment, remote DB writes or existing user-data changes were performed.
