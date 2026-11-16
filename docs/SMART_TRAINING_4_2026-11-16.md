# Smart Training 4 implementation matrix and execution plan

Base: `136f53c`, `feat/program-editor-ux-20261115`. Previous anatomy PR84 and subsequent pain/role work through PR95 are already integrated here. No merge or deployment is authorized.

| Feature | Verified existing state | Gap / action |
|---|---|---|
| RPE | set-load.ts: RIR-adjusted Epley, decimal mode, equipment steps, 5% product guard, three-set decline veto | Expose absolute delta, uncertainty and guard explanations without changing saved performance |
| Progression | program-progression.ts: latest matching session proposal | Add configurable multi-session double/rep/load/RPE draft proposals, preserve publication gate |
| Anatomy | anatomy-training.ts: curated primary/secondary/stabilizer colours, legend, precise deltoid parts | Reuse; connect analytics and active workout context, do not duplicate renderer |
| Pain | Private persisted anatomy reports, side/time/workout/occurrence/set links, history; no coach report sharing | Add explicit named-coach review request, scoped authorization, decisions and audit; no automatic clearance |
| Builder | ProgramBuilder: drafts, batch add, edit/order/copy/revision, import, explicit publication | Add deterministic generator and configurable quality checks using existing PlanItem IDs and draft path |
| Analytics | performance.ts, weekly-progress.ts, histories and e1RM charts | Add read-only muscle-role exposure, target/actual effort, period metrics and explainable observations |
| Workout UX | training-workspace.tsx: autosave/resume/edit/skip/substitute/order/finish, original prescription | Enrich recommendation explanation and analytics access; retain existing save and concurrency guards |
| Historical data | retrospective-workout.ts performedAt/date/timeZone/recordedAt; immutable prescription/revisions | Aggregate by performed date, never mutate history |

## Execution

1. Extend deterministic recommendation/progression helpers with failing tests first; preserve compatibility and medical/pain gates.
2. Build generator into existing coach draft editor without saving/assigning automatically; test quality and invalid inputs.
3. Extend explicit pain sharing/review with additive migration, synthetic ownership/revocation/idempotency tests.
4. Add analytics using completed working sets, qualified external load, actual performed dates and separate muscle roles. Test missing data, repeated IDs, invalid loads, date boundaries and historical immutability.
5. Integrate bilingual components; exercise mobile views at320,390,430,768px in both directions, collect screenshots.
6. Run typecheck, focused tests, full suite, build and CI; deliver review PR(s) with exact evidence and remaining limitations.

## Evidence and boundaries

The existing e1RM heuristic is not an individually validated 1RM measurement. RIR accuracy varies by experience and loading. Sources: [Zourdos et al.](https://pubmed.ncbi.nlm.nih.gov/26049792/), [RIR reliability](https://pubmed.ncbi.nlm.nih.gov/33337690/), [ACSM progression position stand](https://pubmed.ncbi.nlm.nih.gov/19204579/). Product thresholds and configurable rules must not be labelled clinical thresholds. Generated drafts, review decisions and statistical observations do not diagnose injury or clear training through pain.

## Implemented scope

- Transparent next-set explanations: unconstrained model estimate, practical constrained weight, kg/lb delta, percentage, uncertainty and reasons. Existing continuous loading remains available; no performed weight is overwritten.
- Multi-session double/rep/load/RPE progression proposals applied only to editable coach drafts. Strategy settings are local UI choices, not a new persisted prescription policy.
- Deterministic program drafts from nine explicitly classified existing catalog exercises, equipment/preferences/exclusions, frequency/duration, rep/RPE/rest defaults and quality warnings. Explicit load into the existing editor starts its normal private-draft autosave. Publishing/assignment remain separate existing actions.
- Read-only authorized-history analytics: performed-date periods, qualified external volume, recorded repetitions, e1RM, target/actual effort, separate anatomical roles and explainable review observations. Missing and unsupported metrics remain absent. Same-day known timestamps retain chronology; date-only retrospective records do not borrow upload timestamps.
- Explicit sharing of one saved pain report with a named eligible coach. Server-owned snapshot, idempotent request ID, versioned approve/reject/modify decisions, audited events, current consent/relationship checks and medical-review hold. No automatic program edits or clinical clearance.
- Owner export/deletion includes shared report copies and their audit events. Additive migration0064 introduces review storage only; historical workout/program tables are unchanged.
- Assisted pull-up counterweight is excluded consistently from external-load progression/e1RM/volume. Actual recorded performance remains available.
- Windows preparation compares normalized CRLF/LF text while preserving the pinned source checksum and exact manifest content.

## Operational limits and remaining work

- No merge or deployment. Migration0064 must be reviewed and applied to the intended LAB before authentic end-to-end pain-review acceptance. Rollback application/UI first; preserve review/audit health records pending the normal retention/export/deletion policy rather than dropping tables automatically.
- Browser evidence is isolated synthetic component QA, not real LAB acceptance, program autosave persistence, iPhone Safari or physical-device testing. SQL authorization/idempotency and migration checks execute separately against local SQLite/workerd.
- Embedded workout pain reports fail closed and withhold alternatives because that wrapper has no validated medical gate input. Learning & Anatomy receives the current onboarding gate and can display only existing per-occurrence coach-approved alternatives. Approval never guarantees safety.
- Review sharing currently supports built-in catalog IDs. Custom exercise reports retain existing private storage and coach messaging; custom review metadata needs a dedicated authorized contract.
- Generator pool is intentionally limited; history/preferences, individualized medical restrictions, advanced goal periodization and persisted coach policy profiles need expansion. Generated drafts are not automatically assigned.
- Recovery/deload/volume-adjustment policies and full long-term analytics pagination are incomplete. Current observations are descriptive product rules, not medical conclusions or measured adaptation.
- Existing autosave/resume/retrospective logging, Smart Import, program revisions/assignment and anatomy role visualization are reused; no duplicate replacement systems were introduced.

Safety-copy sources: [NHS back pain warning symptoms](https://www.nhs.uk/conditions/back-pain/), [NHS chest pain](https://www.nhs.uk/symptoms/chest-pain/).
