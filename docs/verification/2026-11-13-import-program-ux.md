# DoctorCoach 3.0 — Smart Import and program editing evidence

Date: 2026-11-13. Source baseline: PR #75 `e376c91399600cf1274cb159af35876b2728c2ba`, stacked over #74 and integration #62. Work performed only on isolated local feature branch. No hosted data, remote schema, deployment, provider request, or merge.

## Existing behavior retained

Source inspection and focused synthetic tests establish existing multi-sheet parsing, original row/file provenance, bilingual recognition with manual review for ambiguous equipment, private coach alias memory, preview corrections, private drafts/autosave, explicit review/publication and authorized assignment/retrieval. The program editor already supports per-day/section reordering, day/program copying, set/rep/range and per-set RPE editing, reusable private templates and immutable program revisions. These features were not rebuilt.

Fresh Smart Import acceptance:

| Capability | Evidence | Result |
|---|---|---|
| XLSX multi-sheet parsing and coordinate validation | `smart-import-31-workbook.test.mjs`: 900 synthetic rows across three sheets, order/merges/text, duplicate row/cell rejection | Pass; parser scale does not bypass the existing 30-exercise publishing limit |
| Bilingual alias recognition and ownership | `smart-import-31-recognition.test.mjs`, `import-mappings.test.mjs` | Pass; ambiguous variants remain reviewable; only authorized coach alias records are read/written |
| Preview correction, assignment, saving and workout reload | `import-structure-journey.test.mjs` | Pass with synthetic CSV/XLSX and text-table PDF fixtures, repeated occurrences and source weights retained |
| Exact publication prescription | `program-review-view.test.mjs` | Pass: per-set repetition/RPE, exact 33.125kg and missing-target warning |

This is synthetic local acceptance. It does not prove original private workbook, real coach/trainee identities, physical Safari or deployed LAB behavior. Actual PDF bytes/OCR were not part of this focused run.

## Implemented improvements

The editor had day/program copy but no single-exercise duplicate action. Added duplication immediately after the selected exercise, including cardio, with a fresh occurrence identity and deep-copied prescription, custom/import provenance and arrays. The original item and historical program are untouched. The existing 30-item cap applies in both handler and button state.

Added an explicit library replacement panel for draft exercises. The selector accepts the same measurement unit as the current dose, retains sets/repetitions/effort/notes and slot identity, and requires Apply before changing content. Starting load, warm-up sets and previous approved alternatives are cleared with a bilingual explanation because these belong to the previous exercise. Imported source rows remain intact and matching metadata follows the selected exercise. Existing draft autosave and review/publication gates remain the only save/publish path.

The shared editor previously rebuilt load metadata whenever a numeric weight patch had `load: undefined`; the new substitution deliberately clears that field. Limited that metadata-preservation branch to an unchanged exercise ID so replacement cannot recreate the prior exercise's load metadata. Normal weight edits retain their existing unit conversion.

## Verification

Commands run from `apps/doctorcoach-standalone`:

```sh
node --experimental-strip-types --test tests/smart-import-31-workbook.test.mjs tests/smart-import-31-recognition.test.mjs tests/import-structure-journey.test.mjs tests/import-mappings.test.mjs tests/import-review-ui.test.mjs tests/program-review-view.test.mjs
# 29/29 pass
node --experimental-strip-types --test tests/program-copy.test.mjs tests/program-substitution.test.mjs tests/program-autosave.test.mjs tests/program-revisions.test.mjs tests/coach-assignment.test.mjs
# 22/22 pass
node --experimental-strip-types --test tests/program-substitution-view.test.mjs tests/program-substitution.test.mjs tests/program-copy.test.mjs
# 8/8 pass; overlapping assertions, do not sum these totals
node node_modules/typescript/bin/tsc --noEmit
# pass
node node_modules/eslint/bin/eslint.js components/program-exercise-substitution.tsx lib/program-substitution.ts lib/program-copy.ts
# pass
```

New domain tests failed before the missing duplicate/substitution functions were implemented, then passed. Component-handler tests execute real substitution logic with a controlled hook fixture in both HE and EN; selection alone leaves data unchanged and Apply preserves slot identity while clearing load. This is not a rendered browser claim.

Program revision/assignment tests cover stale revisions, concurrent publication, owner scope/revocation, active-workout blocking, audit rollback and retained completed snapshots. Root coordinates final combined build, CI and rendered-browser acceptance; no redundant full-suite rerun is claimed here.

## Remaining limits and risk

- The existing 30-exercise program ceiling remains; the request does not define a replacement maximum and raising it without performance/UX acceptance would be speculative.
- Replacement intentionally requires compatible units. To change a repetitions exercise to a timed exercise, add the new exercise and configure its dose separately.
- Import-source matching controls remain available separately; their historical rematching behavior is preserved.
- Load/warmup clearing is visible and reversible within the editable draft; review before publication remains required.
- No new server permission surface, dependency, migration or database operation was introduced.

## Independent review correction

A reproduced P1 regression was found before review submission: retaining the editable slot identity across a substitution caused `progressionProposal` to match the old exercise's completed session by slot alone. Synthetic goblet-squat 100kg followed by a bench replacement proposed 102.5kg. Added a regression covering both unspecified and explicitly supplied replacement weights. Progression now requires the historical exercise ID to match as well as the slot, and an explicitly unspecified current starting load cannot receive an automatic progression proposal. This does not change the underlying load formula or normal same-exercise recommendations.

The new replacement panel uses its own bilingual search/select labels and existing search utilities; it does not inherit the older shared selector's internal Hebrew text. Tests exercise both native select handlers and Apply in Hebrew/English. The program's reusable source-matching selector remains unchanged.

Final correction validation: `node --experimental-strip-types --test tests/program-progression.test.mjs tests/program-revisions.test.mjs tests/program-substitution.test.mjs tests/program-substitution-view.test.mjs tests/program-copy.test.mjs` — 20/20 pass. ESLint on the new panel, substitution, copy and progression helpers passes.
