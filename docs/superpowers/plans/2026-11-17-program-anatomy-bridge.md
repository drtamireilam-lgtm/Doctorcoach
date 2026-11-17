# Program anatomy bridge

Approved brief: connect program exercises to authored color-coded roles; retain existing model popovers and personal-program day addition; complete exact-muscle/equipment filtering and in-editor muscle → exercise → current-day draft addition for coach ProgramBuilder. No inferred muscle mappings, backend/schema changes, automatic publication, or navigation away from unsaved editor.

1. Add authored exact-muscle options/filter to existing coach picker, composed with query/group/equipment/family. Unknown mappings remain explicitly unknown.
2. Reuse read-only WorkoutLearningDialog with an optional exercise action slot. Add a scoped ProgramAnatomyLearning opener to picker results and program exercise cards, allowing explicit available-catalog additions to the selected day/section through existing batch append. Pending edits, busy state and capacity block additions; opening/navigating learning stays read-only. Return focus to opener.
3. Verify new behavior RED/GREEN, existing suites/typecheck, responsive browser journeys, one fresh review, exact tested isolated LAB release under existing authorization. PR96/98 remain draft/unmerged.

Pre-flight: picker filter and dialog share authored exercise identities. Additions consume current ProgramBuilder day/section and existing append validation; optional action leaves active/history learning read-only. Existing model annotations/colors already fulfill that portion; do not duplicate models.

Implementation complete: authored exact-muscle options/filter composes with existing equipment/name/group/family; reusable local learning opener in picker, quick cards and advanced cards; optional action is absent for existing workout/history callers. Additions preserve existing append/identity/draft/publication contracts. Current day/section shown, parent guarded by quickDirty/busy; actual append rechecks capacity/catalog. 25 focused checks passed before review.

Final review: one Important Next directive-prologue issue fixed with program-anatomy-client-boundary test RED→GREEN; 26 focused checks pass. No minors or unresolved findings. Full post-fix suite 2,228/2,228, TypeScript and diff checks passed. CI runtime acceptance pending. Existing authored mappings/popovers reused; unknown/custom mappings are not inferred.

CI44124693975 exposed a browser-fixture mismatch: CareSelect uses Radix combobox/option buttons, not native selects. Corrected test interaction to use accessible combobox/option controls; no product changes or weakened assertions. Focus restoration waits for the existing animation-frame completion. Candidate CI rerun required.
