# Active workout write authorization — 2026-10-05

All training mutations now recheck authorization inside their single SQL update,
alongside session owner, active status and optimistic version. This closes the
read/check/write gap for set recording, approved substitutions, next-set load
changes and RPE/RIR preference changes.

Coached sessions require the same active assignment, linked active coach and
consent. Independent/legacy sessions require active independent entitlement.
Completed intake and absence of an open medical review are also rechecked.
Effort-scale changes now consistently follow the same safety gate as set edits.

If authorization changes mid-request, nothing is written and the API returns
403 with the current owner-scoped session. Competing session writes remain 409.
Finish/cancel remain available after revocation or safety blocking and operate
only on saved session data, never arbitrary client snapshots.

Regression tests inject changes immediately before the update, covering all
mutation types, medical/intake checks, staff roles, assignment/mode changes,
expired membership, competing writes and closing a blocked workout.
TypeScript and production build accompany the full test suite. No schema change.

Browser/mobile and distinct real-account acceptance remain pending because the
supported browser QA capability is unavailable. Next product gap to assess:
connecting the existing readiness check-in to workout start, so users do not
have to navigate to a separate recovery tab to record it.
