# Assigned staff review queue

Development branch only; no remote migrations, deployments, account-data writes or messages sent.

## Behavior

Coach/clinician dashboard adds a queue above follow-up tasks, with pending/reviewed workout filters and workout/check-in/video categories. Existing clinical reviews and task management remain intact. The queue shows up to 100 items and explicitly warns when truncated; pending items with pain or an end-of-session note sort ahead of other items, then newest first. Counts are not a claim of all-time workload.

Completed workouts show saved pain flags (maximum of before, after, performed sets and next-day report) and the trainee's saved end note. Opening a workout fetches that exact completed session under fresh authorization, regardless of its position in the normal five-session staff preview. Explicit checked confirmation is required before marking “reviewed by me”. This records only the current staff ID/role and session version; it does not edit the trainee's workout, send a message, grant permission or medically clear the trainee. A subsequent session-version change resurfaces the workout. Each staff member has their own acknowledgment.

Pending weekly check-ins and videos without feedback link to the existing authorized client tabs for actual response/feedback. Acknowledging a workout does not resolve these. A check-in leaves the queue only after the existing response flow; a video only after feedback. Links open the client's relevant tab, not a bypass URL or public file URL.

## Access

Authenticated private/no-store GET/POST /api/staff-review-queue. Only active coaches and clinicians can use it, only for active care-scope associations and current terms/privacy/health/team consent. Video metadata additionally requires current media consent. Operations-only admins, coordinators and trainees have no access. No medical questionnaire, document, clinical-note fields, file key or video bytes are returned.

Each list/detail query includes role, current association and consent predicates in the SQL snapshot. Acknowledgment uses INSERT SELECT guarded by the same predicates, exact source version and completed state. No captured JavaScript authorization result alone permits a write. Source owner is looked up server-side; submitted client IDs are not trusted. Account export includes acknowledgment metadata; deletion scopes cover both the trainee and reviewer with insert/update deletion barriers.

## Deployment

New migration 0047_staff_workout_reviews.sql creates the acknowledgment table and deletion guards. Pending branch migrations are now **0045, 0046 and 0047**. Apply only to isolated staging after a verified private backup/restore check, before deploying the new Worker. Do not rerun historical migrations or change pilot/production. No remote migration has been run in this development turn.

## Validation

SQLite regression tests cover assigned access, precise session retrieval, no clinical/file-key leakage, separate reviewers, changed-version resurfacing, explicit confirmation, unassigned accounts and roles, association/staff/consent revocation, revocation after initial lookup, actual video feedback, actual check-in response, and acknowledgment not resolving other work. Full suite, TypeScript and standalone build required. Real browser, phone layout, live team-account and actual file playback checks remain pending staging deployment.
