# Integrated trainee journey verification

Three tests now exercise actual stores together with all production migrations
in a fresh SQLite-backed D1 adapter. They do not pre-complete onboarding or seed
an active trainee entitlement, and use only synthetic private test data.

| Journey | Verified behavior |
| --- | --- |
| Coached trainee | Intake/consent and tour; no self-selection; two-day coach assignment; readiness snapshot; RIR-to-canonical effort; immediate e1RM; within-session load adjustment; completion; progress/timeline; staff projection; owner export and account isolation |
| Clinical review | Red flags block assignment; coach cannot clear; explicit clinician decision enables assignment; pain suppresses load suggestion; revocation blocks further edits; ordinary intake update does not restore coach access; persistent flags reopen review; closing/history stays available |
| Independent subscription | Separate onboarding without team grants; payment report alone cannot grant access; verified admin approval enables self program; expiration blocks edits/new workouts; closing and progress/export remain available |

All 580 regression tests and TypeScript pass. The first two test drafts had
incorrect expectations about the best-set e1RM and persistent red flags; these
were corrected to match the documented behavior. No new application defect was
found and no product behavior changed in this batch. Added source-level coverage
is the deliverable; there is no new visible feature in this release.

Production build/package runs through Sites. This is store integration testing,
not browser end-to-end testing, live payment verification or live D1/R2 QA.
Next verify combined rehabilitation/nutrition journeys and role projections.
