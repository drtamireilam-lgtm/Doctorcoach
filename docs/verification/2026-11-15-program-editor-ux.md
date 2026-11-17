# Program editor UX — synthetic development and acceptance

## User scope

User authorized a full plan and implementation of four improvements: exercise selection, dose editing, draft preview and preserving work. Live coach/trainee/secretary accounts and hosted role acceptance are explicitly deferred. This work uses synthetic local/CI fixtures only; no real identity, account provisioning, live data, remote SQL, deployment or merge.

Base: PR82 `e23e1283b228a9a1964959dff6193fc9f95434d9`. Existing draft persistence/versioning, assignment, importer, historical records and authorization remain unchanged. Plan: `docs/superpowers/plans/2026-11-15-program-editor-ux.md`.

## Implemented work

| Area | Behavior |
|---|---|
| Multi-exercise selection | Queue exercises across search, filters and pages; explicit ordered add; retain one-click deliberate repeated additions. Whole-batch capacity/catalog rejection preserves selection. Parent rechecks30-item limit and creates distinct occurrence IDs. Queue scoped by day/section. |
| Quick dose view | Optional compact cards replace expanding every advanced editor. Explicit field commit on blur/Enter, guarded local buffers and reset, current-occurrence scope, reps/sets/rest/effort validation. RPE/RIR and rest0/blank/mm:ss/minutes retain meaning. Individualized per-set prescriptions stay protected in advanced editing. |
| Passive draft preview | All workout days/sections using actual trainee prescription components, exact ranges/per-set targets, rest/tempo/warmups, kg/lb/per-side metadata, missing-value warnings and private custom instructions. Preview opens without saving or publishing, including when draft server state is unavailable. Back preserves draft; Edit day returns to that day. |
| Save convenience | End-of-editor save/retry and preview actions reuse the existing private autosave machine. Existing overwrite/conflict/leave protections retained. Pending quick-field buffers prevent save/preview/publication; view/day/load changes require explicit discard. |

No second saving engine, new API or schema. Quick fields support repetitions and timed seconds/minutes with their existing bounds; cardio prescription editing remains in the existing advanced editor. Physical-device verification stays separate.

## Evidence

- Focused new and affected batch, quick-dose, preview, builder wiring, footer, autosave, publication review/revisions and assignment tests passed locally. Final local affected subset:75/75 passed.
- Standalone TypeScript and new-file/helper/test ESLint passed. ProgramBuilder's existing file retains2 lint errors/5 warnings in unrelated ClientWorkspace/StaffWorkspace code. The identical2/5 result was reproduced on untouched PR82 source; no suppression or unrelated lint refactor added.
- Production standalone build passed.
- Initial CI screenshots were visually inspected at narrow widths. Follow-up scoped styles pair preview labels/values in a compact grid outside the trainee workspace, align quick inputs when rest helper text is present, and localize the picker occurrence count. Browser assertions cover grid/field alignment on the final source.
- Independent source review found one concrete omission: cardio rest was absent from draft preview. HE/EN regressions first failed for both0/90; rest rendering moved outside the strength branch. Focused regressions then passed.
- Passive preview additionally guards invalid/unbounded set counts from unfinished advanced edits. Bilingual regressions reject0/negative/fractional/100/1000000 counts without calling trainee dose rendering or allocating set rows; original values/name/notes remain for correction.
- New real ProgramBuilder + disposable SQLite browser harness exercises HE/EN320/390/430/768/1363: search/queued add, quick dose/rest0, preview/back with no added write, failure/retry, invalid-buffer navigation warning, saved draft reload, no publication requests and geometry. Wired into candidate CI with screenshot/result retention.
- Local Chromium remains blocked by OS Unix-socket policy; no local rendered pass claimed. Final CI result and exact source/tree are appended to the PR body, rather than changing a tested source just to record CI.

## Limits and review

Synthetic coach/client objects are disposable test fixtures, not a request for user accounts. No hosted role acceptance is required to finish this source task. Physical iPhone/Safari, keyboard/safe-area/VoiceOver remain distinct/unverified. Preview is not an authenticated trainee session or assignment proof. Existing30-exercise publication maximum and advanced per-set editing remain. No production/LAB rollout is claimed.

Review new work by selecting exercises across searches, adding them to another day, switching quick/advanced views, editing a field then attempting to leave, retrying failed save and reopening the saved draft. Preview must leave assignment/current workout/history unchanged. Candidate CI exercises existing surrounding workflows for integration compatibility.
