# DoctorCoach 2.0 implementation plan

**Goal:** Extend the existing full app with safe bilingual import matching, flexible Excel structure recognition, separate warmup/work prescriptions and a compact workout experience; verify and deploy LAB only.

**Spec:** User's attached complete DoctorCoach 2.0 request, received 20 October 2026. User explicitly directs continuous implementation without stage approvals.

**Base:** `932e4efb43f92911b8221f73cd5f1ab8f9041edf`, `feature/lab-apple-anatomy-integration-20261020`. This includes prior Liad navigation, premium themes, Apple UI and bilingual anatomy. The preferred team branch `90283fb` remains an older divergent foundation. PRs 20–26 and latest CI were inspected; no main merge is authorized.

**Architecture:** Extend existing canonical catalog and local XLSX parser, preserving private mapping memory and review. Keep work-set result arrays/indexes unchanged. Add optional warmup prescription and result arrays to existing item/session snapshots and additive self-plan storage; route warmup writes through the existing authorization/version/consent barriers. Reuse existing premium theme system and existing calculation formulas.

## Shared contracts

- `WarmupSetPrescription = {amount:number;weight:number}` in `lib/training.ts`; unit inherited from exercise, max 20 warmup sets. `PlanItem.warmupSets?:WarmupSetPrescription[]`, `PlanItem.side?:'left'|'right'|'both'`, `SessionExercise.warmupResults?:SetResult[]`.
- Warmup PATCH uses action `warmupSet`, same occurrence addressing and version checks as work `set`. It never shifts work-result indexes or affects work-load advice.
- `matchExerciseForImport(name,catalog?)` in `lib/exercise-matching.ts` returns `{exerciseId:string,status:'exact'|'alias'|'normalized'|'suggested'|'ambiguous'|'unmatched',confidence:number,candidates:{exerciseId:string,score:number,reason:string}[]}`. Only unique verified matches set exerciseId. Fuzzy/ambiguous results require explicit selection. Catalog IDs never change.
- Parser extends existing ImportRow with optional `matchStatus`, `matchConfidence`, `warmupSets`, `side`. Separate warmup-set column preserves embedded exercise warmups. Section headers classify preparation vs main without becoming workout days. Uncertain data is warned, never silently discarded or imputed.

## Tasks

- [ ] 1. Matching: expand verified canonical aliases; normalize punctuation, bilingual equipment abbreviations and common spelling; reject equipment/angle contradictions. Add separate held-out evaluation and report actual coverage/precision/abstention, without claiming a representative 95% result from synthetic data.
- [ ] 2. Workout storage: validate optional warmups/side; additive migration; self/coached/templates/history roundtrip; guarded write API and controller; exclude preparation from all strength/progress/export calculations; add warmup editor/result UI components.
- [ ] 3. Excel: flexible header/block/combined-prescription/timed/mobility/side recognition; preserve repeats, blanks, formulas and source dose. Extend real preview with accessible confidence labels/colors, unresolved-only review and explicit complete-plan confirmation.
- [ ] 4. Workout UI: integrate separate warmup/work rows, unified preparation section, compact e1RM/next-set output and existing safety/unsaved protections. Add bilingual How DoctorCoach Works under existing learning area. Reuse existing Apple premium styles/tokens, preserve all themes and anatomy.
- [ ] 5. Verification: targeted RED/GREEN tests, full root and full-app tests/typecheck/build/lint, independent reviews, Linux CI artifacts, schema comparison/backup before any necessary LAB migration. No real user-record edits.
- [ ] 6. Release: publish dedicated branch and draft PR, deploy exact verified artifact to existing isolated LAB, verify live public/mobile and synthetic-account journeys where access permits; preserve main and Production. Deliver Hebrew report with counts, measured matching results, real limits and links.

## Rulings and ledger

- Preparation catalog items and existing custom-exercise support are reused; aliases must never create exercises.
- Existing `warmup/main/stretch` stored section IDs remain backwards compatible; warmup and stretch are presented together as preparation.
- Targeted tests use Node's in-process runner in this Windows environment; complete workerd/build verification uses Linux CI because child-process execution is restricted locally.
- Supabase supplies LAB identity; workout/appearance records belong to the dedicated D1 database. Do not introduce duplicate Supabase tables for data already stored in D1.
