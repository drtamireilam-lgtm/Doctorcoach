# Unresolved import-row review — 2026-10-26

## What the 85 rows actually contain

All 191 extracted rows from the same five authorized development workbooks were re-evaluated. The 106 automatic assignments are unchanged; all 95 baseline automatic targets remain unchanged. Of the 85 unassigned rows:

| Review category | Row occurrences | Coach action |
|---|---:|---|
| No exercise name | 46 | Check source and column mapping; explicitly correct or skip |
| Potential workout headings | 2 | Confirm heading, explicitly skip if appropriate |
| Ambiguous variant | 24 | Confirm missing implement, posture, direction or body region |
| No matching builtin variant established | 9 | Search all available catalog entries/custom exercises before creating an entry |
| Question or alternative choices | 3 | Confirm intended exercise with coach |
| Instruction rather than an exercise name | 1 | Resolve instruction before choosing exercise(s) |
| Unclassified | 0 | — |

These are extracted **rows, not 85 confirmed exercises**. There are 145 nonempty names, including headings and instructions. Neither 106/191 nor 106/145 is an accuracy measure. Workbooks are a development corpus used for curation, not independent labels or a held-out evaluation. No private source filenames, sheet names, prescriptions, or full row text are committed.

No additional alias was approved during this pass: the remaining names do not unambiguously identify existing variants. Alias totals remain 3,041 (+2,510 over base), all 173 existing catalog IDs retain 15+ normalized bilingual alternatives. The matcher itself, catalog IDs, prescriptions, schemas and auto-assignment policy are unchanged.

## Product change

The real importer now explains known review cases in HE/EN. Machine leg curl offers only seated/lying choices; cable triceps extension offers pushdown/overhead choices for manual review. A possible missing variant, blank name or heading offers no misleading fuzzy shortcut. Unknown names retain the existing suggestions and full catalog search. Every proposed selection still needs a coach click; rows are never auto-skipped.

The diagnostics are review hints, not a new general language parser. Fixed names are drawn from the observed development cases; unseen inputs retain the previous fallback. The category `missing-variant` describes the reviewed builtin-corpus case, not a guarantee about an individual coach's custom catalog. The displayed text therefore asks the coach to search before creating a new entry.

## Browser evidence

`scripts/import-browser-smoke.mjs` mounts the **actual ProgramExcelImport and LanguageProvider**, importing the same CSS list as the app layout, in a local Vite harness. Synthetic GET responses supply an empty custom catalog and one synthetic saved correction. The harness's onAccept callback captures an in-memory draft; it is not an authenticated coach draft save.

`local-browser.json` records 12 passed flows: HE/EN × 390px/1440px × CSV/XLSX/text-PDF. Each uploads real synthetic bytes, waits for the parser, inspects the posture diagnostic, confirms no automatic unknown assignment, manually selects seated leg curl, confirms preview and checks the exact IDs/doses delivered to the draft callback. PDF requires explicit source-table review. CSV additionally retains blank/heading/missing-variant rows until explicit skip and downloads/parses the actual review-only JSON file in all four language/width combinations. All checks assert no horizontal overflow, uncaught browser errors, external requests or API writes.

This is Chromium at desktop/mobile viewport sizes, **not Safari/iOS or authenticated live LAB**. Local database persistence/assignment/workout authorization is covered by the existing application suite and built Worker smoke separately. No remote environment or existing user records were modified.

Reproduce with installed Chromium (or Playwright's default browser):

```sh
DC_IMPORT_CHROMIUM=/path/to/chromium node scripts/import-browser-smoke.mjs
```

The harness binds only 127.0.0.1:37865 and blocks external browser requests. Evidence defaults to ignored `.sites-runtime/import-browser-evidence/`; no browser binary or new npm dependency is added to the repository. The environment's default Playwright browser download failed; an npm-distributed Chromium runtime was installed outside the checkout to run the same harness.

## Review and release limits

An independent review found a too-strong catalog-absence statement and a stale DOM assertion after the review-only filter hid a corrected row. The statement now asks for search rather than asserting absence; a custom-catalog regression test fails before the fix and passes afterward. The browser test waits for the intended row removal and verifies the accepted item IDs.

Full application suite: 1,502 pass, zero failed/skipped. Root foundation/profile RLS: 10+6 pass. TypeScript, targeted lint, isolated LAB build/static configuration validation and built local Worker smoke pass. Full-app lint remains baseline debt; no whole-app lint claim is made. The new exact-head CI must be checked after push.

Live LAB remains on an earlier candidate. Cloudflare's Apple sign-on failed in this session; authenticated desktop/mobile save → assignment → trainee workout → refresh remains a release gate. No merge or deployment was attempted.
