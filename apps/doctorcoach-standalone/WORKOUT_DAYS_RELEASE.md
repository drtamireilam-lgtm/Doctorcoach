# Coach-assigned workout days — 2026-10-05

Coaches can assign exercises to seven stable workout slots (not weekdays or dates).
The existing total limit of 30 exercises per program remains. The same exercise
can appear on several days, with separate prescriptions and approved alternatives,
but cannot be duplicated within one day. Empty days are omitted from trainee choices.

The trainee selects only a populated day from the active coach-assigned program.
The server rejects missing selection for multi-day programs and unknown days.
Starting an existing active session resumes it, rather than switching its day.
Only the selected day's items and set totals are snapshotted into the session.
Day metadata remains in those snapshots through substitutions and history.

Legacy plans map to slot 1 without rewriting records or requiring new selection.
Independent paid-mode training remains unchanged. Program publication still creates
an immutable assignment and cannot replace a program during an active workout.
No SQL migration, role, audience, account or billing change is required.

Checks: full SQLite-backed regression suite, TypeScript check and production build.
Browser/mobile acceptance remains unverified: supported browser QA unavailable.

This is not calendar scheduling, automatic day progression, configurable day names
or a full version comparison/editor. Those and real-account acceptance testing remain
future work; the full master plan is not complete.
