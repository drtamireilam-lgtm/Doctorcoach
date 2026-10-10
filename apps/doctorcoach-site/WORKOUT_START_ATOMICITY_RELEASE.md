# Atomic workout start — 2026-10-05

Inspection of the integrated coach-to-trainee workflow found a check/write race:
the active program or authorization could change after start validation but
before the session insert. A second plan lookup could also resolve a different
program from the ID used for the session snapshot.

Start now loads the exact authorized immutable assignment and conditions the
insert on the current program pointer, plan contents, active coach/consent,
completed intake and absence of pending medical review. Independent-mode start
checks active entitlement at write time. A failed condition writes no session
and asks the user to refresh. Concurrent legitimate starts still resume the
single active session. There is no schema or permission change.

Regression tests interleave actual publication and synthetic consent, staff,
intake, medical-review and membership changes immediately before the insert.
A combined test covers draft save/restore, review, publication, day selection,
approved substitution, RIR set entry, completion and unchanged assigned plan.

These are server/store integration checks, not browser or real-account tests.
Real coach/trainee sign-in and mobile acceptance remain pending because the
supported browser QA capability is unavailable. Existing-session mutation race
hardening is a separate follow-up; this release covers new workout creation.
