# Private coach drafts — 2026-10-05

One server-side draft per authenticated coach and trainee, stored in a separate
`coach_program_drafts` table. Explicit Save, Restore and Discard controls are
separate from publication. Drafts survive session/device changes after saving;
unsaved editor changes still do not. Restore and discard require confirmation.
Restoring creates a fresh publication request ID, so a draft retained after a
concurrent publication can be edited without reusing an already-published ID.

Draft reads/writes require an active linked coach and are scoped to their user ID.
Neither trainees nor other staff (including other linked coaches) receive them.
Saving permits an empty title/list for work in progress but validates populated
prescriptions. Publication retains all normal safety and assignment checks.

Version-checked writes reject stale saves/deletes. Discard leaves a versioned
tombstone to prevent an old window resurrecting a deleted draft. A successful
publication clears only the exact saved draft version, inside its transaction;
newer edits in another window survive. Publication failure retains the draft.

Migration 0012 adds only the draft table and its unique owner/client index.
No existing records are changed. Existing migration files remain untouched.

Validation: SQLite-backed regression suite, TypeScript and production build.
Browser/mobile/real-account acceptance remains pending because supported browser
QA is unavailable. Manual saving is intentional; there is no automatic save.

Next: preview the complete multi-day program before coach publication, to catch
omissions in days not currently visible in the editor.
