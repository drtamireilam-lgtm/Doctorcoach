# Smart Import 3.0 implementation plan

Goal: a valid program can save, reload and assign without matching every exercise to the global library.
Base: origin/feature/premium-home-ui-20261027 (4e9cac2), retaining deployed premium UI and integrated LAB import/calendar/cardio work. LAB before: e5f945cf-7bf3-4b77-9a3d-b4662c7c9b60.

User supplied a detailed execution specification and requested autonomous work. Implement inline using existing parser, review, draft, assignment, custom snapshot and private alias services. No design approval pause. The real file תוכנית_אימון_RPE.xlsx is absent from attachments and searched workspaces; requested from user. Do not invent its rows or claim actual 26-row acceptance.

- [x] Pin failures: unmatched frontend/domain/backend, C2 single-cell section, context-sensitive RPE lists, per-set repetitions, source data retention.
- [x] Extend PlanItem JSON with validated provenance and program-scoped custom snapshots using a separate import ID namespace. Retain snapshots in existing draft/assignment writes; never insert global exercises. Reject forged library/custom references.
- [x] Preserve file hash/name, worksheet/row/order, immutable original name, normalized name, raw dose/equipment/notes and source cells. Add bounded safe parsing for set-wise repetitions and RPE. Keep exact load metadata.
- [x] Separate MATCHED / NEEDS_REVIEW / CUSTOM_EXERCISE from genuine validation errors. Save all valid states, show summary/filter/status and keep existing explicit review/overwrite protections.
- [x] Reuse coach-owned alias memory and conservative equipment-aware matching. Allow later replacement in program editor with original provenance and historical workout snapshots preserved.
- [ ] Unit/integration/security and bilingual mobile/desktop browser regression. Real-file end-to-end remains pending its receipt.
- [ ] Open dedicated PR, verify CI/build/TypeScript, check live LAB baseline, deploy only LAB and verify assets/auth and non-content metadata. No Production or main merge.

Storage decision: coach drafts and care/workspace programs already store complete items JSON. No new parallel booking/import system or global exercise table. Supabase is identity-only; imported programs reside in D1 and existing guarded JSON stores.

Verification checkpoint: 16 synthetic browser cases passed; 11 Smart Import core and four legacy acceptance tests passed. Full local suite had 1,638 pass and one legacy assertion expecting unknown exercises to block; that assertion was updated to verify a local snapshot and its file suite passes. CI must rerun the whole suite. Built HTTP Smart Import save/reload/assign and >64KB payload passed. A review found active/source rep coupling; separated active setReps and re-review reported no further P1/P2 findings. Actual workbook acceptance remains pending.
