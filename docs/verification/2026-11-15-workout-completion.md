# DoctorCoach workout completion review — 15 November 2026

## Verified baseline

Main remains `818e4ce6`; integration PR62 is open Draft at `dc92326`; PR74 is open Draft at `c58ac66`. The newer workout stack PR75–80 already implements most of this mission. PR80 is open Draft at `b5faad497c062634da731d6950a0a0e15a6bdf6f`. Both62 and74 are ancestors of80 (local ancestry checks). No merge, deployment, remote SQL, provider operation or real-user mutation was performed.

Fresh GitHub reads confirm PR80 candidate run43505690511 is successful, including focused regressions, populated migration compatibility, typecheck/build, retrospective and active responsive flows, device draft races, program ordering and import persistence. The prior1852-test full-suite result is retained as historical PR80 evidence, not rerun or claimed as today's test count.

Fresh provider reads confirm the latest LAB deployment is still9e34aeed-6a4c-4e01-9238-ff63d1f1abf7 from10November, serving version b2e15c42-8ac3-4f62-863a-9853908a6d71 at100%. Its previously identified build5f2ffc9e-87c1-417f-a9a0-5bf58c3a9c7b still reports success and manual branch/commit `codex/integration-59-60-61-20261029` / `dc92326`. No new deployment occurred. This task did not repeat the version-to-build linkage query, schema, backups or restore checks.

## Implementation matrix

| Requirement | Current source evidence | Disposition |
|---|---|---|
| Past program/free workouts; date/time; Jerusalem DST; private drafts | PR75/76, retrospective-workout.ts and store/editor | Already implemented; do not duplicate |
| Historical corrections and audit/idempotency/CAS | PR77/79, retrospective-workout-store.ts and journal0062 | Implemented for retrospective records; live-completed corrections remain missing |
| Add/replace/duplicate/order exercises/days; draft/revision/assignment | PR76/80 and program controls/import reports | Already implemented; preserve historical snapshots |
| Rest/tempo/sets/reps/RPE import and editing | PR80 plus existing importer/PlanItem contract | Already implemented;30-exercise publication limit retained |
| XLSX/CSV/text PDF; sheets; matching; preview; assignment/reload | Existing Smart Import and PR80 rendered CI steps | Existing functionality retained; scanned PDF explicitly unsupported |
| Active logging/autosave/resume/edit/finish | PR76/78/79 | Already implemented; IndexedDB recovery is scoped to working strength fields |
| Decimal next-set load, reps/target RPE, invalid-data guards | set-load.ts; earlier reviewed tests/CI | Existing continuous mode and documented5% guard retained; no formula change |
| HE/EN mobile matrices | PR80 CI responsive/import/order steps successful | Historical exact-source synthetic evidence retained; no fresh physical-device acceptance |
| Upload failure feedback | Actual ProgramExcelImport handler regression | Fixed in this follow-up; see below |
| Ownership/history/data integrity | Existing store/commit guards, prior focused/security CI | No new authorization or server surface |

## New reproduced defect and correction

Actual upload handlers showed that invalid/oversized file feedback omitted CSV and remained Hebrew in English mode. English generic failures and scanned-PDF feedback also remained Hebrew. Initial focused regression:6 of7 tests failed for these reasons.

The component now lists XLSX, CSV and PDF with XLS conversion guidance in the selected language, provides safe bilingual generic read failure feedback, and translates scanned-PDF guidance while retaining the failed page number. Specific existing parser errors are otherwise preserved. Rejected uploads are not read; the file input and busy state reset, and no save/assignment occurs. This is a focused feedback correction, not importer reconstruction or complete parser-error localization.

Nine new tests execute the real transpiled component upload handler with synthetic file events and mocked PDF-reader rejections. Final affected local subset:11/11 passed,0 failed/skipped. Standalone TypeScript, targeted ESLint and whitespace checks passed. The candidate workflow explicitly includes the new handler tests. No dependency/schema/RPE change; no migration is needed for this follow-up itself. PR75–80's0061/0062/0063 prerequisites still apply to the combined stack.

Independent read-only review found no actionable issue in the component/test diff. VM tests bypass actual Localize/DOM and do not establish rendered typography, live PDF decoding or physical browser behavior. Parent PR80 import-browser evidence remains the prior baseline, not a new run on this correction.

## Fresh LAB scope and remaining blockers

Public browser navigation Home → My program was observed in Hebrew and English. Sign-in messaging and disabled start controls were present; no login/OTP/account creation or writes were attempted. No retrospective controls were shown in that signed-out deployed view. This is public access-boundary evidence, not authenticated workflow acceptance or proof of deployed feature availability.

1. PR75–80 remain review candidates, not deployed functionality. Reconcile actual LAB schema and the reviewed0061→0062→0063 additive migrations in the correct namespace, recovery evidence and exact-source release envelope before requesting separate remote SQL/deployment approval.
2. Designated synthetic coach/two-trainee identities and permitted relationships remain unspecified. Signed-in hosted import→edit→assign→active/past workout→history→cross-owner denial is unverified.
3. Physical iPhone/Safari, keyboard/safe-area/VoiceOver and full nine-screen matrix remain unverified. Existing Chromium/WebKit evidence must not be relabeled as a physical-device pass.
4. Correction of ordinary live-completed sessions is missing. The retrospective editor is unsuitable: its parser rebuilds set/cardio state, removes warmup/live provenance fields and rewrites start/end times. A separate audited results-only correction path should preserve original timestamps, origin, prescription, untouched warmup/cardio/pain/provenance fields, entitlements and ownership. Do not simply remove the retrospective SQL filter.
5. Complete English localization of every parser-specific error is not claimed. Scanned PDFs remain unsupported; existing30-exercise and compatible-unit substitution limits remain.

Next development mission: implement the separate audited correction path for live-completed strength sets, with immutable timing/origin and exact retry/concurrency behavior. Next acceptance mission: controlled synthetic LAB rehearsal of the existing reviewed workout stack after its separate schema/release gates. No protected action is authorized by this report.
