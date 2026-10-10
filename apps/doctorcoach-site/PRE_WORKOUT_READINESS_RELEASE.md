# Readiness at workout start — 2026-10-05

The start dialog now shows today's existing readiness report and offers inline
creation/editing using the same wellness form and API. Sleep, energy, perceived
load and note are saved to the existing daily record; no separate collection or
duplicate report is introduced. Current pain remains the session's existing
before-workout field. Daily readiness is not an immutable per-session snapshot.

Reporting is optional. Once editing begins, Start and dialog dismissal remain
disabled until the report is saved or edits are explicitly cancelled. Saving
disables cancellation. Cancel reloads the current server record, allowing recovery
from version conflicts. The scrollable dialog accommodates smaller screens.
The readiness note limit now matches server validation (1000 characters).

The existing API retains health-consent, ownership, role and version checks.
Saving readiness is separate from starting the workout; a later start failure
does not undo a successful report. Readiness never clears a medical block and
does not prescribe an automatic load or declare fitness to train.

Checks: regression suite, TypeScript, production build. Integration tests cover
create/reload/update, a single daily record, coach visibility/revocation, stale
writes, validation and training-block preservation. Browser/mobile acceptance
still requires verification; supported browser QA is unavailable.

Next: simplify the trainee's daily navigation so training, readiness and team
follow-up can be reached without hunting across sections, preserving the public
site and staff workspace as separate experiences.
