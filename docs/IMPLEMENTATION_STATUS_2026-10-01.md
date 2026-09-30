# DoctorCoach implementation status — 2026-10-01

This status records what is actually implemented in the current React/TypeScript MVP and keeps production requirements separate from browser-local prototype behavior.

## Implemented in the current MVP

- Shared athlete profile and onboarding flow.
- Injury/no-injury branching and red-flag screening.
- Medical Review routing without automated diagnosis.
- Medical clearance states: `pending-review`, `cleared`, `cleared-with-restrictions`, `hold`.
- Medical reviewer identity, review timestamp, restrictions and review notes.
- Medical hold gating for injury-specific workout guidance.
- Shared restrictions visible inside Training.
- Demo/client-side role guards for trainee, coach, medical, dietitian and admin roles.
- Coach Workout Builder with multi-day assignment foundation.
- RPE/RIR mode conversion with target semantics preserved when switching modes.
- Persistent multiple-set workout logging in browser storage.
- Per-set load, reps, effort, pain, e1RM and same-session next-load suggestion.
- Coach-approved substitution selection foundation.
- Program version metadata with draft/active/archived states.
- Program-version events recorded in the shared timeline.
- Workout start, set logging, coach plan save and workout completion events recorded in the shared timeline.
- Rehabilitation injury journey with six phases.
- Rehab pain before/during/immediately after/next day and ROM logging.
- Body-weight tracking in the rehab/progress flow.
- Progress dashboard for e1RM, readiness, next-day pain, ROM, body weight and adherence.
- Shared clinical/performance timeline.
- Outcome-score storage with explicit licensing/validated-instrument warning.
- Nutrition plan, daily adherence, weekly check-in, dietitian notes and team queues.
- CI workflow that installs dependencies, type-checks and builds the Vite app.

## Validation

GitHub Actions `DoctorCoach CI` run 26 passed on commit `48d1567b16141b3dff9be4e41bf7e4fbe5f057cf` after fixing CSS type declarations and ES-target compatibility.

## Still not production-ready

The following remain real production requirements and must not be confused with the browser-local MVP:

- Real identity provider / authentication.
- Server-side authorization and row-level access enforcement.
- Production database and migrations.
- Production audit log.
- Versioned consent records and withdrawal workflow.
- Secure object storage and access control for videos/media.
- Backup/recovery, monitoring and incident handling.
- Full privacy/security review and jurisdiction-specific legal review.
- Complete exercise catalog and content governance.
- Full program snapshots/version restoration rather than version metadata only.
- Independent SELF subscription and real payments.
- Production appointment workflow and notifications.

## Safety boundary

DoctorCoach may organize intake data, screen warning signs and route users to the appropriate next step. It must not represent automated output as a physician diagnosis. Red flags and medical hold states override injury-specific automated training guidance until reviewed.
