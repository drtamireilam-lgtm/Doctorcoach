# Program revision editor — 2026-10-05

The assigned coach can load the current program into a detached editor draft.
Days, sets, repetitions, effort scale/target, notes and approved alternatives are
copied. Replacing a nonempty draft requires confirmation. Publishing creates a
new program ID through the existing atomic assignment workflow, never updates
the old program row, and keeps completed workout snapshots intact.

`revisionOf` requires the base program to still be active. This is checked both
before and inside the publication batch, preventing stale revision writes.
Old successful retries remain no-ops and cannot reactivate historical programs.
Active workouts, safety review, revoked sharing and staff-role checks still apply.

Care responses now explicitly identify the active program. The coach sees active
versus prior assignments; trainees still see only their active assigned plan.
No database migration, audience, account, authentication or billing changes.

Verification: full regression suite, TypeScript and production build. Supported
browser QA is unavailable, so mobile and real-account acceptance remain pending.

Scope limits: drafts are in memory only; revision ancestry and numeric revision
labels are not persisted, and side-by-side version comparison is not implemented.
Next bounded improvement: save and recover unfinished coach drafts without
publishing them or exposing them to trainees.
