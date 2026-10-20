# Episode-linked rehabilitation measurements

Trainees may explicitly select an active clinician-recorded injury when logging
pain, ROM and function. Selecting it supplies the matching region and side.
Server validation rejects other-owner, missing, closed or anatomically mismatched
episodes. Linked measurements cannot be moved or detached. Old client payloads
retain existing links. Historical unassigned measurements remain unchanged;
owners can explicitly link a compatible unassigned measurement.

The recovery view filters active/closed episodes or unassigned measurements.
Comparison keys include episode, side, motion and response timing so two injuries
at the same body region never share one chart. Existing region charts and log
editing remain. Closed episode measurements remain visible; the clinician must
reopen follow-up before further linked writes.

SQL write guards recheck active state and matching anatomy at measurement insert
and update. Clinician region/side changes are blocked when linked measurements
exist, including a measurement inserted during a concurrent episode update.
Existing version concurrency and owner authorization remain in force.
Generic wellness JSON stores the optional episodeId; no migration or backfill.
Owner exports already contain the link.

Verification: TypeScript and all 160 automated tests passed. Six new tests cover
ownership/reporting permissions, matching anatomy, legacy linkage preservation,
closed/reopened episodes, concurrent closure/anatomy changes, concurrent linked
measurement insertion and separate graph groups. Production build is performed
by the publication workflow. Browser layouts, live account flows and live D1
behavior remain unverified.

Boundary: this does not infer diagnoses, advance stages, change training plans
or clear medical restrictions. Workout pain snapshots remain session-based.
