# DoctorCoach 3.0 — verified baseline and acceptance gates

Fresh inspection: 13 November 2026. No deployment, merge, remote SQL, protected recovery, real identity, patient or trainee data used.

## Repository baseline

| Item | Fresh result |
|---|---|
| PR62 | Open Draft, not merged; integration head dc92326a326db388932af46c92f1176287a9a6e8; base audit/full-lab-20261027 |
| PR74 | Open Draft, not merged; head c58ac66977b37834ac84a4270b05772ec622da20; base PR62 integration |
| PR75 | Open Draft, not merged; head e376c91399600cf1274cb159af35876b2728c2ba; base PR74; retrospective workouts already implemented |
| PR70–73 | Merge commits present in integration ancestry; do not repeat their implementation |
| PR62 exact-head CI | DoctorCoach CI #247 success, run 42402728970 |
| PR74 exact-head CI | DoctorCoach CI #249 success, run 43044584832; synthetic pilot #7 success, run 43044584860 |
| PR75 exact-head CI | GitHub commit workflow query returned no runs; existing workflow branch filters omit this stacked branch/base combination |

New work is isolated on feat/doctorcoach-3-workout-ux-20261113 based on PR75. It retains PR74 fixes and PR62 integration by direct ancestry. A candidate-only workflow covers stacked feature branches with read-only GitHub permissions, focused tests/build and disposable synthetic browser fixtures, without a deployment step.

Prior master report libfile_0a23e2881ec481918ffa964d93527fc7 was read. Its 194 local core tests, public LAB observations and recovery evidence are historical evidence, not newly executed results. Existing PR74 responsive Chromium/WebKit evidence is retained; physical iPhone acceptance remains open.

## Fresh deployment provenance

Read-only Cloudflare deployment lookup confirmed active deployment 9e34aeed-6a4c-4e01-9238-ff63d1f1abf7, created 2026-11-10T14:29:15.514841Z. Version b2e15c42-8ac3-4f62-863a-9853908a6d71 receives 100% traffic.

Exact version-ID build lookup mapped it to successful build 5f2ffc9e-87c1-417f-a9a0-5bf58c3a9c7b, manual source branch codex/integration-59-60-61-20261029, commit dc92326a326db388932af46c92f1176287a9a6e8. Thus PR74, PR75 and this candidate are not on LAB. Build branch filter configuration is not substituted for the actual source mapping. No byte-equality claim is made.

## Acceptance matrix

| Workflow | Synthetic local status | Hosted LAB status |
|---|---|---|
| Multi-sheet parse, aliases, preview corrections, assignment, save/retrieve | Focused source/store tests pass; see import report | Original workbook and signed-in identities unverified |
| Retrospective free/program workout, private draft, duplicates, null values | Existing PR75 plus new optional time/DST/store and bilingual React DOM evidence | Feature not deployed; migration0061 remains gated |
| Program duplicate/substitute/reorder/drafts/revisions | Focused tests and bilingual component checks; existing history protections retained | New actions not deployed |
| Active workout save/resume/RPE/decimal choice | Existing functionality retained; new field autosave tested separately | New autosave not deployed |
| 320/390/430/768 HE/RTL and EN/LTR rendering | BLOCKED: Chromium Unix-socket restriction before app load; CI fixture supplied | Not freshly verified |
| Physical iPhone/Safari, VoiceOver, keyboard/safe area | Unverified | Requires physical-device acceptance |
| Provider authentication/Google Calendar | Existing synthetic evidence retained | No authorized synthetic hosted identity established; no provider writes |

Reports: 2026-11-13-import-program-ux.md, 2026-11-13-workout-experience.md, 2026-11-13-premium-ux-matrix.md. Do not combine overlapping test counts or label DOM emulation as rendered browser evidence.

## Release risks and next gate

- Candidate remains Draft until exact-source CI/browser evidence and human review are available.
- Migration0061 belongs to PR75; this continuation does not authorize remote application of it. Date-only old records remain valid; optional exact time is retained in existing retrospective metadata.
- Replacement clears unsafe previous load; exercise identity must also gate historical progression suggestions.
- Unsaved navigation/finish guards remain necessary until autosave receives server confirmation. Network denial must preserve editable data and manual retry.
- Existing 30-exercise publishing ceiling remains; parser 900-row coverage is not large-program publication acceptance. Text PDF is supported; scanned/OCR acceptance is not claimed.
- No main or integration merge, deployment, protected restore, remote grants, provider events or production modifications.

Next milestone: rendered candidate acceptance in CI, followed by authorized synthetic signed-in LAB and physical iPhone/Safari testing after separate exact-source migration/release approval.

## Coordinator validation

Fresh aggregate batch: 113/113 focused assertions passed across retrospective/time, duplication/substitution/progression, program autosave/revisions/assignment, workout experience/write races/access, set autosave/load/RIR and Smart Import recognition/workbook/preview/publication. Separate security/history-consumer batch: 40/40 passed across CI coverage, account deletion, approved team permissions, CSV export, performance and weekly progress. These two file lists do not overlap: 153 unique assertions total. Following independent review corrections, the affected retrospective/autosave/race/load/progression subset passed 57/57; this overlaps the aggregate and is not added to it.

Independent review reproduced and corrected cross-exercise progression load transfer and autosave retry after optimistic-concurrency conflicts. Reviewers verified both corrections with no remaining material findings. New input/handler checks are bilingual; real React DOM tests verify retrospective draft round trips, substitution and autosave timers. DOM evidence does not establish visual responsiveness.

TypeScript and production standalone build passed. Targeted lint of new helpers/components and retrospective files passed. Existing hooks/use-training.ts set-state-in-effect error and baseline warnings remain; no full-lint green claim is made. No package or lockfile change.
