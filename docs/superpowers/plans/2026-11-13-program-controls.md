# Rest prescriptions and program ordering

**Goal:** Complete the remaining editable/imported rest intervals and desktop drag/drop with accessible mobile/keyboard ordering.
**Spec:** Workout Experience3 phases2/5/6. Extend existing program architecture and tokens; no merge/deploy/remote schema write/real trainee modification.

**Architecture:** Optional restSeconds in PlanItem, validated and retained through JSON drafts/revisions/assignments/snapshots. Add nullable rest_seconds to independent program_items with one additive migration; old rows remain unspecified. Import aliases/raw provenance retain original rest text; parse clear seconds/minutes/mm:ss and require manual correction for ambiguity. Use shared rest field/label in editors, import preview and workout prescription. Drag/drop only reorders occurrences within the same day/section, with explicit arrow controls retained for mobile/keyboard.

- [x] Failing tests for rest parsing/validation/import provenance, independent persistence, assignment/version/snapshot integrity and ordering bounds/repeated identity.
- [x] Add validated type, additive migration and all relevant independent-plan reads/writes; preserve program-token concurrency checks.
- [x] Add rest alias mapping, row correction, preserved raw source and shared dose display/editor.
- [x] Add native drag handle/drop target using existing private draft state and pure order helper; preserve accessible step controls.
- [x] Run focused unit/integration, actual browser drag and keyboard/touch alternatives in HE/EN/mobile, typecheck/lint/build/runtime, final full suite and independent review. Prepare separate Draft PR stacked79.

No inferred rest default: absent/blank is unspecified; zero means explicitly no rest. Range/unclear source remains reviewable and cannot be silently guessed. Historical completed sessions remain snapshots; live/current programs are not overwritten by trainee session controls.
