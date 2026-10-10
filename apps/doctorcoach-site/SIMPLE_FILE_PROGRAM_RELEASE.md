# Simple Mode — My File and My Program

2026-10-10. Inspected existing owner file tabs, shared notes, archived programs,
injury summary, assigned workout days and start dialog before changing hierarchy.

## My File

The default tab is now labelled Personal details and injuries. Profile/questionnaire
and the clinician-recorded injury summary share the primary column. Connection
management sits in an optional disclosure, initially open when no staff are linked.
Consent explanations, invite acceptance and revocation are retained there.

The team guidance tab presents notes and a link to My Program first. Assigned
programs and previous versions remain available in a labelled disclosure, with
their active/previous state unchanged. Weekly reports, videos and appointments
remain accessible. No records or permissions were removed.

## My Program

Coached users preview one assigned workout day at a time; multi-day programs have
buttons labelled with the assigned day and its exercise count. The selected day
initializes the start dialog, where users can still choose another assigned day.
If the program changes, preview/dialog fall back to a currently assigned day.
This selects a day inside the coach's program, not a different program.

Independent program editing remains unchanged. Continuing an active workout
retains that workout's snapshot. Printing includes every program day, even when
the screen previews one day; the printed heading/count describe the full program.

## Verification boundary

TypeScript, workout-day, trainee journey, recovery-navigation and main-navigation
regression checks, plus a production build. Browser QA is unavailable in this
session; actual mobile/desktop appearance, disclosure interaction and print
layout remain acceptance checks in RELEASE_READINESS.md.
