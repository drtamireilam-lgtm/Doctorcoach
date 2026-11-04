# Smart Import 3.1 — isolated audit and follow-up

29 October 2026. Base PR60 d396b68; no deployment, main merge, DB operation or modification of PR59/60. PR59 head 42a1f14 was checked twice; its Work-owned program-import.ts, exercise-qualifiers.ts, reviewed-import-aliases.ts, shared UI and runtime/CI were left untouched. There is no observed file overlap with this follow-up's two implementation files. Unpushed remote Work edits cannot be inferred from GitHub.

## Existing implementation reused

PR53's indexed NFKC/bilingual alias/token-multiset matcher already distinguishes exact, alias, normalized, suggested, ambiguous and unmatched results. Only verified unique equivalence auto-selects; edit-distance/containment scores are review-only. Existing general variants preserve unspecified implements for many names. Kelso Shrug resolves to its own horizontal-shrug parent. Hammer Strength is not automatically substituted with an arbitrary machine. PR60 supplies unmatched program-scoped snapshots and original-source preservation. Excel, CSV and text-PDF feed the same extraction pipeline; no duplicate importer was added.

## Safe changes

excel-workbook.ts now rejects duplicate data row coordinates, duplicate cell coordinates, cells whose row address disagrees with their container, and malformed/out-of-range shared-string indices. Previously these could overwrite a weight or silently erase an exercise name. Optional blank cached values, formatting-only rows, formulas without a cached value and whitespace-padded string indices remain supported. Formulas are never executed.

exercise-matching.ts memoizes only review-stage fuzzy scans, at most 128 entries per existing WeakMap catalog index. Policy is part of the key; cached outputs are defensively copied. Existing scores, thresholds, literal matches and qualifier decisions are unchanged. Catalog arrays follow the existing immutable-index contract. This avoids rescanning thousands of aliases for the same misspelling repeated across weeks. It does not make unique names free or move parsing off the browser thread.

## Verified local evidence

- Four malformed-workbook regressions failed before the fix; passed after it. Independent review found a valid typed blank-cell regression, reproduced red, fixed and added coverage; re-review found no remaining P1/P2.
- 44 targeted tests passed, including eight new workbook tests and four recognition/cache tests, plus legacy workbook/recognition/CSV/PDF tests.
- A labelled synthetic workbook with 900 rows across three sheets preserved every name, 24.75 weight, 7,7 source text, sheet order and merge metadata. No global exercise creation occurs in the reader. This is not proof that a 900-exercise program can be published.
- Existing 16 bilingual browser cases at 390/1440 passed on final implementation. Initial browser launch timed out while simultaneous build/lint competed for resources; rerun without build passed. No timeout was relaxed.
- TypeScript passed locally. Local build passed before the final optional-blank validation adjustment; final source build/type/full tests are independently required through PR CI.
- Full local lint fails: 105 errors/835 warnings. Targeted lint has three existing no-explicit-any errors in excel-workbook.ts; linting HEAD's original reader reproduces exactly those three. No lint rule was disabled. Other new/modified files have no reported lint findings.
- Same-host 100 repeated misspelling requests: before 2822.9ms, after 111.4ms including cold setup. RSS observations were about 68.7/68.5MB and do not establish a memory improvement. Reproducible benchmark prints cold/warm timings and process memory without flaky timing assertions.

## Recognition quality and dependencies

scripts/smart-import-31-evaluate.mjs evaluates 24 explicitly synthetic reviewed examples: 14 correct automatic matches, 1 incorrect automatic match, 9 requiring manual handling. This is a small diagnostic set, not a production accuracy estimate. The incorrect case is the existing alias בנץ׳ פרס selecting barbell-bench without an explicit implement; the expected safe generic parent is movement-chest-press. Its alias dictionary is Work-owned in PR59; correction is deferred rather than edited concurrently. The 23 unaffected cases are automated regression assertions; the known failure remains visible in the evaluator's JSON.

Current spelling candidates can include anatomically irrelevant suggestions; they are not auto-selected. Correcting/ranking these safely requires coordinated changes to Work's qualifier/alias rules and additional reviewed examples. No confidence thresholds were loosened. PR59 has its own documented original-workbook results; those are not re-reported as tests run by this follow-up.

## Remaining limits

XLSX/CSV up to 5MB, 500 source rows per sheet, 32 columns; XLSX 12 visible sheets, 8MB selected uncompressed XML and 4MB per selected entry. PDF up to 5MB/20 pages/100k text chars, extraction timeout, no OCR. Merge anchors are not copied into covered cells. Existing tempo/warmup/notes and sections remain; there is no dedicated rest/superset entity in the import mapping. Publishing remains limited to 30 exercises. These broader limits and structure changes are integration work, not silently bypassed here.

Recommended next task: after Work reconciles PR59/60, resolve generic transliteration aliases and qualifier-aware suggestion ranking, then decide a bounded multi-day >30 publication design with real-file/browser performance budgets. Keep this PR stacked/draft pending integration. No paid service was introduced.
