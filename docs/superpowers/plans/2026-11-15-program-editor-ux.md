# Program Editor UX — implementation plan

**Goal:** Make selecting exercises, editing doses, previewing drafts and saving program work easier on phone and desktop, using only synthetic local/CI fixtures. User authorized all four workstreams and full implementation; live account/role acceptance remains explicitly deferred.

**Architecture:** Extend the existing ProgramBuilder and its current search, PlanItem prescriptions, private autosave/versioning and publication review. Add optional batch selection, an optional compact dose-edit view, an independent read-only draft preview and convenient end-of-editor save/retry controls. No new API, schema, authentication, assignment policy or design system.

**Base:** PR82 e23e1283b228a9a1964959dff6193fc9f95434d9. No merge or deployment included. Existing PR75–82 functionality and history compatibility must be retained.

## Existing capabilities to preserve

- Bilingual/alias exercise search, filters, deliberate repeat occurrences and thirty-item cap already exist.
- Advanced per-exercise editing, rest/tempo, per-set prescriptions, substitute/copy/reorder already exist.
- Private draft autosave, stale-version protection, failure/manual retry, browser and in-app leave warnings already exist. Reuse them; do not build a second saving engine.
- Current publication review/assignment remains distinct and unchanged. Preview must never save, assign or publish.

## Tasks and ownership

| Workstream | Files / interface | Acceptance |
|---|---|---|
| Batch selection | CoachExercisePicker optional onAddMany(ids); pure selection helper; parent atomic append helper | Preserve queue across search/pages, deterministic order, explicit add, exact capacity recheck, fresh occurrence IDs, one-click add retained. Scope picker by day+section. |
| Quick doses | ProgramQuickDose(items,onChange,disabled,onDirtyChange); pure patch validation | Work through multiple visible strength or timed-exercise cards without expanding advanced panels. Reps/sets/rest/effort validate before commit;0rest valid. Preserve weight/load/notes/tempo/history and heterogeneous per-set prescriptions. Invalid local buffers warn/guard leaving and cannot silently become0/NaN. |
| Draft preview | ProgramDraftPreview(title,items,onBack,onEditDay) | Read-only actual trainee prescription components, ordered days/sections, exact range/per-set effort/rest/tempo/units, user content intact, incomplete-data warnings. No network write or publication action. |
| Save convenience/integration | ProgramBuilder + new ProgramDraftActions | Manual save/retry and preview reachable after editing long day. Reuse existing machine states/overwrite/conflict handling. Pending quick-field buffers block save/preview/publication and require explicit discard before changing views. Existing save/leave guards remain. |

## Steps

- [ ] Write focused failing domain/real-handler tests for each new behavior.
- [ ] Implement each disjoint workstream and integrate via existing builder callbacks.
- [ ] Run focused new and affected picker, dose, review, autosave and revision tests; TypeScript, targeted lint and build.
- [ ] Extend synthetic browser acceptance at HE/RTL and EN/LTR320/390/430/768/1363: batch add, quick edit, preview/back, saved/retrieved draft, failed-save retry, navigation warning, zero publication requests and no page/control overflow. Physical iPhone/Safari remains distinct.
- [ ] Independent final review and actual code PR, with exact source/CI evidence and remaining limits. No user test identities needed, no live services or deployment.

## Review focus

- A cap or catalog change between selecting and applying must not add a partial batch or invent exercises.
- Duplicate exercise IDs must retain distinct occurrences and only selected-day/section changes.
- A quick change must not flatten individualized reps/RPE, clear load, erase unknown values or lose uncommitted input.
- Preview/back must preserve editor title/day/items, private draft state and leave protection; no publish/save side effect.
- Failure/conflict remains visibly unsaved; retry uses the current private-draft version and does not override another writer.

## Verification ledger

Source inspected: batch queue, compact dose editing, and an independent pre-publication preview are missing; autosave and navigation protections exist. Implementation proceeds in an isolated feature branch with separate agent worktrees. Dependency folder was a broken link after workspace maintenance; reinstall the unchanged lockfile locally.
