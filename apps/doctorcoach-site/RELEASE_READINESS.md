# DoctorCoach — remaining release acceptance

Reconciled 2026-10-10 against DEVELOPMENT_STATUS.md, AUDIT_RECONCILIATION.md,
READ_PATH_INVENTORY.md and the production Sites source. This is a bounded next-work
list, not a launch certification. The separate GitHub prototype is not evidence.

## Established baseline

Assigned coached programs, independent membership gating, RPE/RIR-adjusted e1RM
and intra-workout load suggestions, seven-area navigation, progress, rehabilitation
and nutrition are implemented. Store-level journey tests cover their integration;
authorization race tests cover the inspected paths. The last verified suite had
582 passing tests, TypeScript and a production build. These checks do not exercise
real sign-in, browser layout, production storage or payment processing.

Run `npm test` for every tracked `tests/*.test.mjs` file, `npm run typecheck` for
TypeScript, and the Sites build helper for publication. New root-level test files
join the full suite automatically. Record failed cases before making fixes.

## Ordered remaining work

| Order | Work | Acceptance evidence | Required access/input |
| --- | --- | --- | --- |
| 1 | Real trainee and staff journeys on desktop and phone | Complete the matrix below; record device, role, observed result and defects, then retest fixes | Supported browser QA and representative signed-in accounts |
| 2 | Service and membership configuration | Confirm actual runtime prices, enabled offerings and destinations; verify an approved membership changes access and expiration removes new-workout access | Authorized administrator and approved commercial details |
| 3 | Production video workflow | Upload a permitted trainee clip, play it as its owner and authorized staff, add feedback, revoke access and confirm denial; publish/play an exercise demo | Representative accounts, consented test media and live D1/R2 |
| 4 | Clinical and exercise content | Clinician reviews visible learning material and clearance criteria; exercise demonstrations are reviewed and approved before publication | Clinician decisions and approved media; source inspection cannot supply clinical approval |
| 5 | Small pilot and defect closure | Record concrete trainee/staff feedback, fix reproducible defects, rerun affected checks and repeat failed journeys | Pilot participants and their feedback |

Each row remains open until its acceptance evidence is recorded. Do not infer live
configuration from fallback constants: default service prices are unconfirmed,
and membership fallback is disabled with no price or payment URL. Runtime records
can override these. The implemented membership process is manual verified admin
approval; an automatic payment gateway is not claimed. Do not charge test users.

## Browser/account matrix for priority 1

Use synthetic/consented records and keep private screenshots out of public notes.
Run each applicable journey on a desktop viewport and an actual phone browser.

| Actor | Journey | Passing result |
| --- | --- | --- |
| Coached trainee + coach | Sign in → questionnaire/tour → coach assigns multiple days → My Program | Trainee sees the assigned program and cannot select or author an independent program |
| Coached trainee | Record readiness → start workout → record weight/reps/RIR or RPE → next set → finish → Progress | e1RM appears after the set; suggested next load reflects actual effort; prescription stays intact; history and progress match saved sets |
| Trainee + clinician | Report red flags → request review → clinician responds | Training restrictions and review state match the clinician decision; coach cannot provide medical clearance |
| Trainee + dietitian | Assessment → plan → daily/weekly report → response → toggle team sharing | Owner retains history; staff see only their authorized projection; revoked sharing removes the shared summary |
| Trainee + clinician | Injury episode → return plan → measurement → milestone confirmation → close episode | Measurements link to the selected episode; milestones require clinician confirmation; history remains readable |
| Independent user + admin | Request membership → report payment → verified approval → create program → expire membership | Reporting alone grants no access; approved access works; expiration blocks new edits/start while allowing completion of an active workout and export |
| Owner + staff | Export own data → revoke staff connection → staff revisits cached views | Owner export remains available; staff can no longer retrieve revoked information |
| Every applicable actor | Navigate all seven areas; back/refresh; open questionnaire; edit fields with keyboard | No trapped navigation, horizontal clipping or inaccessible controls; errors are understandable and recovery preserves permitted data |

## Current execution boundary

Supported browser QA is unavailable in this session. Actual account journeys,
phone layout, live storage, runtime commercial settings and clinical content
approval have not been verified here. Continue with these acceptance tasks when
their required access exists; do not mark them complete from local SQLite tests.
