# Session flexibility implementation plan

**Goal:** Complete active-workout order and permitted set-count changes while preserving prescription and recorded sets.
**Architecture:** Store an immutable per-occurrence prescription and original position in new session JSON; preserve old-session compatibility without inventing a missing original. Keep self-authorized set-count changes separate from coach dose permissions. Use existing owner/version/access/consent/safety guarded mutations and shared mobile controls.
**Spec:** Workout Experience 3.0 phases4/6. No merge/deployment/remote migration/real trainee write.

- [ ] Write failing domain/SQLite tests: reorder repeats without moving results; capped set addition; remove only unperformed last set; original target/snapshot remains; stale/cross-owner/revocation/coach dose restrictions; refresh persistence.
- [ ] Add session snapshot metadata, pure structural mutations and guarded store actions. No RPE formula changes or new dependencies.
- [ ] Add bilingual mobile controls and original-dose summary; disable while other set drafts are unsaved; exercise real UI handlers and persistence.
- [ ] Run focused regressions, build/typecheck/lint, rendered checks and independent review; prepare separate Draft PR stacked on77.

Decision: Reorder within existing day/section because the current UI groups by section; retain coach dose restrictions. Additional self sets have explicitly unassigned targets. Never remove completed/logged sets or infer an original for older sessions.
