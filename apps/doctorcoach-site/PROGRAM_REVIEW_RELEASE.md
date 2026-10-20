# Complete program review before publication — 2026-10-05

The coach's form now opens a full review screen before any assignment request.
It identifies the trainee and program, lists all populated workout days, and
shows exercises, set/quantity/unit prescriptions, RPE/RIR targets, notes and
approved alternatives. Counts describe all listed days, not a calendar week.

The review uses the same normalization/validation as assignment, including
zero starting weight. Hidden editor days are validated too. The reviewed data
is a detached snapshot and is the payload used for publication. Back/Edit Day
returns to the unchanged editor; publication is a separate explicit action.
Missing effort targets are shown explicitly. Server authorization, revision
conflicts, active-workout restrictions and draft cleanup stay unchanged.

No schema change. Review is not a saved draft or publication. Existing manual
draft saving remains available from the editor. Publication errors remain on
the review screen so the coach can retry or return without losing edits.

Validation: full regression suite, typecheck, production build. Browser/mobile
and real-account acceptance remain unverified because supported browser QA is
unavailable. The next priority is that real coach-to-trainee acceptance flow,
including login, draft restoration, publication and workout completion.
