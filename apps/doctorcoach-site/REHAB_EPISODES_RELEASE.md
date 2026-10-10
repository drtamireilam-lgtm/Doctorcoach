# Injury episodes and separate rehabilitation plans

Assigned clinicians can record a named injury/problem with region, side and
active/closed follow-up state. Trainees see the records in their personal file.
The recovery workspace selects one episode or the legacy general plan. Each
episode has a separate return plan, milestones and up to 50 historical versions,
with an accurate per-plan total. A long history cannot displace another plan.

Existing general plans and snapshots remain unassigned. Existing plans cannot
be reassigned. Older clients retain an existing episode link when updating.
Closed episodes retain plans/history, but block plan writes until explicitly
reopened by the clinician. Active state is checked again inside the write SQL.
Closing follow-up does not clear restrictions or confer medical clearance.

Uses existing versioned wellness records and atomic revision triggers; no
schema migration, questionnaire conversion or clinical diagnosis inference.
Owner export already includes episodes and linked plan revisions.

Verification: TypeScript and 154 automated tests passed, including permissions,
owner isolation, legacy compatibility, immutable linkage, closed/reopened
episodes and independent history limits. Production build required for release.
Browser layout and real signed-in account flows remain unverified.

Boundary: rehabilitation measurements remain region/side/movement based and
are not assigned to episodes. No automatic clinical progression.
